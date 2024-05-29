package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/Aaron-json/groovestream_backend_go/pkg/auth"
	"github.com/Aaron-json/groovestream_backend_go/pkg/db"
	"github.com/Aaron-json/groovestream_backend_go/pkg/storage"
	"github.com/dhowden/tag"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type MediaType int

const (
	AUDIOFILE MediaType = 0
	PLAYLIST  MediaType = 1
)

// Audiofile shape to be sent to the user. Audiofile structs that are not sent to the user do need to follow this type.
type AudioFile struct {
	Id          int              `json:"id" db:"id"`
	StorageId   string           `json:"storageId" db:"storage_id"`
	Filename    string           `json:"filename" db:"filename"`
	Type        MediaType        `json:"type" db:"-"` // must be the Audiofile constant. not in the database add manually
	UploadedAt  time.Time        `json:"uploadedAt" db:"uploaded_at"`
	UploadedBy  int64            `json:"uploadedBy" db:"uploaded_by"`
	PlaylistId  int64            `json:"playlistId" db:"playlist_id"`
	Title       *string          `json:"title" db:"title"`
	Album       *string          `json:"album" db:"album"`
	Artists     []string         `json:"artists" db:"artists"`
	Duration    *float32         `json:"duration" db:"duration"`
	TrackNumber *int             `json:"trackNumber" db:"track_number"`
	TrackTotal  *int             `json:"trackTotal" db:"track_total"`
	Genre       *string          `json:"genre" db:"genre"`
	Icon        *AudiofileIcon   `json:"icon" db:""`
	Format      *AudiofileFormat `json:"format" db:""`
}

type AudiofileIcon struct {
	MimeType string `json:"mimeType" db:"icon_mime_type"`
	Data     []byte `json:"data" db:"icon"`
}

type AudiofileFormat struct {
	MimeType   string  `json:"mimeType" db:"mime_type"`
	Bitrate    *int    `json:"bitrate" db:"bitrate"`
	Channels   *int    `json:"channels" db:"channels"`
	Codec      *string `json:"codec" db:"codec"`
	Container  *string `json:"container" db:"container"`
	SampleRate *int    `json:"sampleRate" db:"sample_rate"`
}

// Parses the database audiofile format into the standard format to be sent to the user.
// Only needed for outgoing data to maintain compatibility with current api format
func ParseDbAudiofile(dbAudiofile *db.DbAudioFile) *AudioFile {
	audiofile := &AudioFile{
		Id:          dbAudiofile.Id,
		StorageId:   dbAudiofile.StorageId,
		Filename:    dbAudiofile.Filename,
		Type:        AUDIOFILE,
		UploadedAt:  dbAudiofile.UploadedAt,
		UploadedBy:  dbAudiofile.UploadedBy,
		Title:       dbAudiofile.Title,
		Artists:     dbAudiofile.Artists,
		Album:       dbAudiofile.Album,
		Duration:    dbAudiofile.Duration,
		TrackNumber: dbAudiofile.TrackNumber,
		TrackTotal:  dbAudiofile.TrackTotal,
		Genre:       dbAudiofile.Genre,
		Format: &AudiofileFormat{
			MimeType:   dbAudiofile.MimeType,
			Bitrate:    dbAudiofile.Bitrate,
			SampleRate: dbAudiofile.SampleRate,
			Container:  dbAudiofile.Container,
			Codec:      dbAudiofile.Codec,
			Channels:   dbAudiofile.Channels,
		},
	}
	if dbAudiofile.Icon != nil {
		audiofile.Icon = &AudiofileIcon{
			Data:     dbAudiofile.Icon,
			MimeType: *dbAudiofile.IconMimeType,
		}
	}
	return audiofile
}

// Function to download the file to the user. Expects "storageID" path value
// in the request.
func StreamAudioFile(w http.ResponseWriter, r *http.Request) {
	audioID := chi.URLParam(r, "storageID")
	bucket := storage.Client.Bucket(os.Getenv("GLOBAL_AUDIOFILES_BUCKET"))
	file := bucket.Object(audioID)
	fileReader, err := file.NewReader(context.Background())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer fileReader.Close()
	n, err := fileReader.WriteTo(w)
	w.Header().Set("Content-Type", "application/octet-stream")
	if (err != nil && err != io.EOF) || n == 0 {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

type Result struct {
	Filename string `json:"filename"`
	Error    string `json:"error,omitempty"`
}

func UploadAudioFile(w http.ResponseWriter, r *http.Request) {
	curTime := time.Now()
	playlistId, err := strconv.Atoi(chi.URLParam(r, "playlistID"))
	if err != nil {
		log.Println(err)
		http.Error(w, "Could not parse playlist Id", http.StatusInternalServerError)
		return
	}
	authData, err := auth.GetRequestAuth(r)
	if err != nil {
		log.Println("Error getting authorization information")
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	reader, err := r.MultipartReader()
	if err != nil {
		log.Println("Error getting multipart reader")
		http.Error(w, "Request is not multipart form data", http.StatusBadRequest)
		return
	}
	resultsCh := make(chan Result, 5)
	nParts := 0
	for {
		part, err := reader.NextPart()
		if err != nil {
			break
		}
		nParts++
		log.Println("processing new part...", part.FileName())
		// to avoid deadlocks and missed data, every part MUsT write exactly ONE response to the channel.
		handlePart(part, int64(playlistId), authData, resultsCh)
	}
	res := make([]Result, 0, nParts)
	// batch uploading to database
	var nFailed int
	for range nParts {
		result := <-resultsCh
		if result.Error != "" {
			log.Println(result.Error)
			nFailed++
		}
		res = append(res, result)
	}
	status := 200
	if nFailed > 0 {
		status = 500
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(&res)
	log.Println(time.Since(curTime))
	log.Println("request finished")
}

// Reads the part into a buffer and processes the part concurrently, allowing parralel processing of parts.
// Should not attempt to read from the part after this method is called
func handlePart(part *multipart.Part, playlistID int64, authData auth.RequestAuthData, resCh chan Result) {
	defer part.Close()
	// set up buffer to save file
	buf := bytes.NewBuffer(bufPool.Get())
	// write the file to the buffer and exit immediately to start the next part
	_, err := io.Copy(buf, part)
	if err != nil {
		resCh <- Result{
			Filename: part.FileName(),
			Error:    err.Error(),
		}
	} else {
		go processFile(buf.Bytes(), playlistID, part, authData, resCh)
	}
}

// parses metadata from the given file and creates an audiofile from it.
// This function will always return at least the minimum required information to create an audiofile object
func createAudiofile(r io.ReadSeeker, resCh chan *db.DbAudioFile, userID, playlistID int64, filename, storageID, mimeType string) {
	audiofile := db.DbAudioFile{
		StorageId:  storageID,
		Filename:   filename,
		UploadedBy: userID,
		PlaylistId: playlistID,
	}
	tags, err := tag.ReadFrom(r)
	if err != nil {
		resCh <- &audiofile
		return
	}
	if album := tags.Album(); album != "" {
		audiofile.Album = &album
	}
	if title := tags.Title(); title != "" {
		audiofile.Title = &title
	}
	trackNumber, trackTotal := tags.Track()
	if trackNumber != 0 {
		audiofile.TrackNumber = &trackNumber
	}
	if trackTotal != 0 {
		audiofile.TrackTotal = &trackTotal
	}
	if genre := tags.Genre(); genre != "" {
		audiofile.Genre = &genre
	}
	artists := make([]string, 0, 3)
	if artist := tags.Artist(); artist != "" {
		artists = append(artists, artist)
	}
	if albumArtist := tags.AlbumArtist(); albumArtist != "" {
		artists = append(artists, albumArtist)
	}
	if composer := tags.Composer(); composer != "" {
		artists = append(artists, composer)
	}
	if len(artists) != 0 {
		audiofile.Artists = artists
	}
	audiofile.MimeType = mimeType
	if picture := tags.Picture(); picture != nil {
		audiofile.Icon = picture.Data
		audiofile.IconMimeType = &picture.MIMEType
	}
	resCh <- &audiofile
}
func processFile(buf []byte, playlistID int64, part *multipart.Part, authData auth.RequestAuthData, resCh chan Result) {
	defer bufPool.Put(buf) // return buffer to pool when finished processing
	newObjectId := uuid.NewString()
	tagsCh := make(chan *db.DbAudioFile, 1)
	storageCh := make(chan error, 1)

	// upload to storage
	go storage.UploadToStorage(context.Background(), bytes.NewReader(buf), newObjectId, len(buf)+(1024), storageCh)

	// process tags and create audiofile obj
	go createAudiofile(bytes.NewReader(buf), tagsCh, authData.UserID, playlistID, part.FileName(), newObjectId, part.Header.Get("Content-Type"))

	if err := <-storageCh; err != nil {
		// storage failed
		resCh <- Result{Filename: part.FileName(), Error: err.Error()}
		return
	}
	audiofile := <-tagsCh
	err := WriteAudiofileToDb(context.Background(), audiofile)
	if err != nil {
		storage.DeleteObject(context.Background(), newObjectId)
		resCh <- Result{Filename: part.FileName(), Error: err.Error()}
	} else {
		resCh <- Result{Filename: part.FileName()}
	}
}

// Uploads the given file to the database
func WriteAudiofileToDb(ctx context.Context, audiofile *db.DbAudioFile) error {
	queryStr := `
	INSERT INTO "audiofile" (filename, storage_id, title, uploaded_by,
	duration, playlist_id, album, artists, genre, mime_type, sample_rate, track_number,
	track_total, container, codec, channels, bitrate, icon, icon_mime_type)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);
	`
	_, err := db.Pool.Exec(ctx, queryStr, audiofile.Filename, audiofile.StorageId, audiofile.Title, audiofile.UploadedBy, audiofile.Duration,
		audiofile.PlaylistId, audiofile.Album, audiofile.Artists, audiofile.Genre, audiofile.MimeType,
		audiofile.SampleRate, audiofile.TrackNumber, audiofile.TrackTotal, audiofile.Container, audiofile.Codec,
		audiofile.Channels, audiofile.Bitrate, audiofile.Icon, audiofile.IconMimeType)
	return err
}
