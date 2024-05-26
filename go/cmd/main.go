package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/Aaron-json/groovestream_backend_go/pkg/db"
	"github.com/Aaron-json/groovestream_backend_go/pkg/storage"
	"github.com/Aaron-json/groovestream_backend_go/routes"
	"github.com/joho/godotenv"
)

func main() {
	// paths are relative to the root of the go project
	if err := godotenv.Load("./secrets/.env"); err != nil {
		log.Panicln(err)
	}
	if err := db.InitDb(); err != nil {
		log.Panicln(err)
	}
	if err := storage.InitClient(); err != nil {
		log.Panicln(err)
	}
	port := os.Getenv("PORT")
	if port == "" {
		// not in production.
		port = "8080"
	}
	if err := http.ListenAndServe(fmt.Sprintf(":%v", port), routes.Handler()); err != nil {
		log.Println(err)
	}
}
