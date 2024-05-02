package controllers

import (
	"bytes"
	"context"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"

	"github.com/Aaron-json/groovestream_backend_go/pkg/storage"
	"github.com/dhowden/tag"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

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
	w.Header().Set("COntent-Type", "application/octet-stream")
	if (err != nil && err != io.EOF) || n == 0 {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func UploadAudioFile(w http.ResponseWriter, r *http.Request) {
	// playlistID := chi.URLParam(r, "playlistID")
	reader, err := r.MultipartReader()
	if err != nil {
		http.Error(w, "Request is not multipart form data", http.StatusBadRequest)
	}
	for {
		part, err := reader.NextPart()

		if err != nil {
			if err == io.EOF {
				break
			} else {
				// Handle error reading a file

			}
		}
		log.Println("Handling part")
		handlePart(part)
	}
}

func handlePart(part *multipart.Part) error {
	log.Printf("File name: %v, Part name: %v", part.FileName(), part.FormName())
	// wrap the multipart reader to write to the metadata buffer
	var metadataBuf bytes.Buffer
	partWrapper := io.TeeReader(part, &metadataBuf)
	// reading reading metadata
	// metadataCh := make(chan tag.Metadata, 1)
	// set up writing file to the cloud
	storageId := uuid.NewString()
	object := storage.Client.Bucket(os.Getenv("GLOBAL_AUDIOFILES_BUCKET")).Object(storageId)
	ctx, cancelFunc := context.WithCancel(context.Background())
	objectWriter := object.NewWriter(ctx)
	defer cancelFunc()
	n, err := io.Copy(objectWriter, partWrapper)
	if err != nil {
		log.Println(err)
		cancelFunc()
		return err
	}
	log.Printf("Uploaded size %v", n)

	return nil
}

// Parses the tags. Returns a nil value if an error occured
func parseTags(rs io.ReadSeeker, resCh chan tag.Metadata) {
	metadata, err := tag.ReadFrom(rs)
	if err != nil {
		resCh <- nil
	}
	resCh <- metadata
}
