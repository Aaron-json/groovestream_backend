package db

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func InitDb() error {
	connString := fmt.Sprintf("postgres://%s:%s@%s/%s?sslmode=require&pool_max_conns=10",
		os.Getenv("PG_USER"), os.Getenv("PG_PASSWORD"), os.Getenv("PG_HOST"), os.Getenv("PG_DATABASE_NAME"))

	config, err := pgxpool.ParseConfig(connString)
	if err != nil {
		return err
	}
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return err
	}
	Pool = pool
	return nil
}
