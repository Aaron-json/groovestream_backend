package routes

import (
	"net/http"
	"net/http/pprof"

	"github.com/Aaron-json/groovestream_backend_go/controllers"
	"github.com/Aaron-json/groovestream_backend_go/pkg/auth"
	"github.com/Aaron-json/groovestream_backend_go/util"
	"github.com/go-chi/chi/v5"
	"github.com/rs/cors"
)

func Handler() http.Handler {
	mux := chi.NewRouter()

	// middleware
	mux.Use(CorsMiddleware) // always first
	mux.Use(auth.ParseRequest)

	// routes
	mux.Get("/media/stream/{storageID}", controllers.StreamAudioFile)
	mux.Post(("/media/0/{playlistID}"), controllers.UploadAudioFile)
	if util.ENVIRONMENT == "development" {
		mux.HandleFunc("/debug/pprof/*", pprof.Index)
		return mux
	}
	return mux
}

func CorsMiddleware(h http.Handler) http.Handler {
	var allowedOrigins []string
	if util.ENVIRONMENT == "development" {
		allowedOrigins = []string{"http://localhost:5173"}
	} else {
		allowedOrigins = []string{"https://www.groovestreamapp.com"}
	}

	corsConf := cors.New(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})
	return corsConf.Handler(h)

}
