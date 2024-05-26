package storage

import (
	"context"
	"io"
	"os"
)

const (
	DEFAULT_UPLOAD_BUFFER_SIZE = 5 * 1024 * 1024
)

func DeleteObject(ctx context.Context, storageID string) error {
	return Client.Bucket(os.Getenv("GLOBAL_AUDIOFILES_BUCKET")).Object(storageID).Delete(ctx)
}

// bufSize should be slightly higher than the actual file size.
// If bufsize is equal to or less than 0, then the default bufSize will be used
func UploadToStorage(ctx context.Context, r io.Reader, storageID string, bufSize int, resCh chan error) {
	if bufSize == 0 {
		bufSize = DEFAULT_UPLOAD_BUFFER_SIZE
	}
	ctx, cancelFunc := context.WithCancel(ctx)
	//object writer
	objectWriter := Client.Bucket(os.Getenv("GLOBAL_AUDIOFILES_BUCKET")).Object(storageID).NewWriter(ctx)
	defer objectWriter.Close()

	if bufSize > 0 {
		objectWriter.ChunkSize = bufSize
	} else {
		objectWriter.ChunkSize = DEFAULT_UPLOAD_BUFFER_SIZE
	}

	_, err := io.Copy(objectWriter, r)
	if err != nil {
		cancelFunc()
		resCh <- err
	} else {
		resCh <- nil
	}
	cancelFunc() // for development.
}
