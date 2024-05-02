package routes

import (
	"net/http"

	"github.com/Aaron-json/groovestream_backend_go/controllers"
	"github.com/Aaron-json/groovestream_backend_go/pkg/auth"
	"github.com/Aaron-json/groovestream_backend_go/util"
	"github.com/go-chi/chi/v5"
	"github.com/rs/cors"
)

func Handler() http.Handler {
	mux := chi.NewRouter()
	if util.ENVIRONMENT == "production" {
		mux.Use(auth.ParseRequest)
	}
	// middleware is ran last to first. cors is added last since it always has
	// to be first
	mux.Use(CorsMiddleware)
	mux.Get("/media/stream/{storageID}", controllers.StreamAudioFile)
	mux.Post(("/media/0/{playlistID}"), controllers.UploadAudioFile)
	// middleware is ran in the inverse order of being registered
	return mux
}

func CorsMiddleware(h http.Handler) http.Handler {
	var allowedOrigins []string
	if util.ENVIRONMENT == "development" {
		allowedOrigins = []string{"http://localhost:5173"}
	} else {
		allowedOrigins = []string{"https://www.groovestreamapp.com"}
	}

	cors := cors.New(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})
	return cors.Handler(h)

}
