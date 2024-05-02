package storage

import (
	"context"

	"cloud.google.com/go/storage"
	"google.golang.org/api/option"
)

var Client *storage.Client

// This function must be called before attempting to use the client.
// If an error is returned do not attempt to use the Client.
func InitClient() error {
	var err error
	Client, err = storage.NewClient(context.Background(), option.WithCredentialsFile("./secrets/gcloud-secrets.json"))
	if err != nil {
		return err
	}
	return nil
}
