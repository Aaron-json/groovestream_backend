package controllers

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/Aaron-json/groovestream_backend_go/pkg/auth"
	"github.com/Aaron-json/groovestream_backend_go/pkg/storage"
	"github.com/dhowden/tag"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type MediaType int

const (
	Audiofile MediaType = 0
	Playlist  MediaType = 1
)

type AudioFile struct {
	Id          int              `json:"id"`
	StorageId   string           `json:"storageId"`
	Filename    string           `json:"filename"`
	Type        MediaType        `json:"type"` // must be the Audiofile constant
	UploadedAt  string           `json:"uploadedAt"`
	UploadedBy  int              `json:"uploadedBy"`
	PlaylistId  int              `json:"playlistId"`
	Title       *string          `json:"title"`
	Album       *string          `json:"album"`
	Artists     []string         `json:"artists"`
	Duration    *int             `json:"duration"`
	TrackNumber *int             `json:"trackNumber"`
	TrackTotal  *int             `json:"trackTotal"`
	Genre       *string          `json:"genre"`
	Icon        *AudiofileIcon   `json:"icon"`
	Format      *AudiofileFormat `json:"format"`
}

type AudiofileIcon struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}
type AudiofileFormat struct {
	MimeType   string  `json:"mimeType"`
	Bitrate    *int    `json:"bitrate"`
	Channels   *int    `json:"channels"`
	Codec      *string `json:"codec"`
	Container  *string `json:"container"`
	SampleRate *int    `json:"sampleRate"`
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

type UploadResponse struct {
	Successful []string
	Failed     []FileProcessingError
}

type FileProcessingError struct {
	Filename string `json:"filename"`
	Cause    string `json:"cause"`
}

// If an error happens and the file cannot be processed completely (not even partially),
// audiofile should be a nil pointer the error must be populated.
// If processing is successful Audiofile must be a non-nil pointer and err is not checkedd.
type uploadResult struct {
	audiofile *AudioFile
	err       FileProcessingError
}

func UploadAudioFile(w http.ResponseWriter, r *http.Request) {
	playlistIdStr := chi.URLParam(r, "playlistID")
	if playlistIdStr == "" {
		log.Println("Playlist Id not found")
		http.Error(w, "Playlist ID is required", http.StatusInternalServerError)
		return
	}
	playlistId, err := strconv.Atoi(playlistIdStr)
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
	resultsCh := make(chan uploadResult, 5)
	nParts := 0
	for {
		part, err := reader.NextPart()
		if err != nil {
			break
		}
		nParts++
		log.Println("processing new part...", part.FileName())
		// to avoid a deadlocks and missed data every part MUsT write exactly ONE response to the channel.
		handlePart_test(part, playlistId, authData, resultsCh)
	}
	res := UploadResponse{
		Successful: make([]string, 0, nParts),
		Failed:     make([]FileProcessingError, 0), // most likely to remain empty
	}
	for range nParts {
		result := <-resultsCh
		if result.audiofile == nil {
			res.Failed = append(res.Failed, result.err)
		} else {
			res.Successful = append(res.Successful, result.audiofile.Filename)
		}
	}
	var status int
	if len(res.Successful) == 0 {
		status = http.StatusInternalServerError
	} else {
		status = http.StatusCreated
	}
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(&res)
	log.Println("request finished")
}

func handlePart_test(part *multipart.Part, playlistID int, authData auth.RequestAuthData, resCh chan uploadResult) {
	// set up buffer to save file
	log.Println(part.Header)
	buf := new(bytes.Buffer)
	// write the file to the buffer and exit immediately to start the next part
	_, err := io.Copy(buf, part)
	if err != nil {
		resCh <- uploadResult{
			err: FileProcessingError{
				Filename: part.FileName(),
				Cause:    "HandlePart: Error Reading file",
			},
		}
	} else {
		go processFile(buf.Bytes(), playlistID, part, authData, resCh)
	}
}

func processFile(buf []byte, playlistID int, part *multipart.Part, authData auth.RequestAuthData, resCh chan uploadResult) {
	newObjectId := uuid.NewString()
	wg := new(sync.WaitGroup)
	wg.Add(2)
	var (
		uploadErr error
		tagErr    error
		tags      tag.Metadata
	)
	go func() {
		defer wg.Done()
		// setup writing to the server
		ctx, cancelFunc := context.WithCancel(context.Background())
		object := storage.Client.Bucket(os.Getenv("GLOBAL_AUDIOFILES_BUCKET")).Object(newObjectId)
		objectWriter := object.NewWriter(ctx)
		defer objectWriter.Close()

		// write to the cloud
		_, err := io.Copy(objectWriter, bytes.NewReader(buf))
		if err != nil {
			log.Println(err)
			cancelFunc()
			uploadErr = err
		}
		cancelFunc() // for development.
		log.Printf("File upload fninished for file %s", part.FileName())

	}()
	go func() {
		defer wg.Done()
		metadata, err := tag.ReadFrom(bytes.NewReader(buf))
		if err != nil {
			log.Println(err)
			tagErr = err
		}
		tags = metadata
		log.Printf("Tag parsing finished for file %s", part.FileName())
	}()

	wg.Wait()
	if uploadErr != nil {
		resCh <- uploadResult{
			err: FileProcessingError{
				Filename: part.FileName(),
				Cause:    "processFile: Error uploading file to storage",
			},
		}
		log.Println(uploadErr)
		return
	}
	if tagErr != nil {
		// use the minimal information required and save the file
		log.Println(tagErr)
		resCh <- uploadResult{
			err: FileProcessingError{
				Filename: part.FileName(),
				Cause:    "processFile: Error parsing tags",
			},
		}
		return
	}
	// set non-audio related information
	audiofile := AudioFile{
		Type:       Audiofile,
		StorageId:  newObjectId,
		Filename:   part.FileName(),
		UploadedAt: time.Now().String(),
		UploadedBy: int(authData.UserID),
		PlaylistId: playlistID,
	}
	// apply audio related information
	applyTags(&audiofile, tags, part)
	log.Println("Finished processing file...", part.FileName())
	resCh <- uploadResult{audiofile: &audiofile}
}

// Applies parsed tags to the audiofile struct.
func applyTags(audiofile *AudioFile, tags tag.Metadata, part *multipart.Part) {
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
	if picture := tags.Picture(); picture != nil {
		audiofile.Icon = &AudiofileIcon{
			MimeType: picture.MIMEType,
			Data:     base64.StdEncoding.EncodeToString(picture.Data),
		}
	}
	audiofile.Format = &AudiofileFormat{
		MimeType: part.Header.Get("Content-Type"),
	}
}
