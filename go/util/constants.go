package util

import (
	"errors"
	"flag"
	"log"
)

var ENVIRONMENT string

const (
	DEVELOPMENT = "development"
	PRODUCTION  = "production"
)

func ParseEnvFlags() error {
	prod := flag.Bool("prod", false, "running in production")
	dev := flag.Bool("dev", false, "running in development")
	flag.Parse()
	if *prod && *dev {
		flag.Usage()
		return errors.New("cannot run in both dev and prod")
	} else if !*prod && !*dev {
		flag.Usage()
		return errors.New("environment not specified. Use -prod or -dev")
	} else if *prod {
		log.Println("running in production")
		ENVIRONMENT = PRODUCTION
	} else {
		log.Println("running in development")
		ENVIRONMENT = DEVELOPMENT
	}
	return nil
}
