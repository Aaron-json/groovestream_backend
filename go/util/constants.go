package util

import "os"

var ENVIRONMENT string

func init() {
	if os.Getenv("K_SERVICE") == "" {
		ENVIRONMENT = "development"
	} else {
		ENVIRONMENT = "production"
	}
}
