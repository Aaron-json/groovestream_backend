package db

import (
	"context"
	"fmt"
	"os"

	"github.com/Aaron-json/groovestream_backend_go/util"
	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func InitDb() error {
	var host string
	if util.ENVIRONMENT == "development" {
		host = os.Getenv("PG_HOST_DEV")
	} else {
		host = os.Getenv("PG_HOST")
	}
	connString := fmt.Sprintf("postgres://%s:%s@%s/%s?sslmode=require&pool_max_conns=45",
		os.Getenv("PG_USER"), os.Getenv("PG_PASSWORD"), host, os.Getenv("PG_DATABASE_NAME"))

	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return err
	}
	Pool, err = pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return err
	}
	return nil
}
