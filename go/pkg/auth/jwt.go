package auth

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	jwt.RegisteredClaims
	UserID int64 `json:"userID"`
}
type RequestAuthData struct {
	UserID int64 `json:"userID"`
}
type authContextKey string

const (
	authKey authContextKey = "auth"
)

// extracts claims from a request.
func parseRequest(r *http.Request) (JWTClaims, error) {
	accessToken := r.Header.Get("Authorization")
	if accessToken == "" {
		return JWTClaims{}, errors.New("authorization header not found")
	}
	claims := JWTClaims{}
	sepIdx := strings.Index(accessToken, " ")
	_, err := jwt.ParseWithClaims(accessToken[sepIdx+1:], &claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("ACCESS_TOKEN_SECRET")), nil
	})
	if err != nil {
		return JWTClaims{}, err
	}
	return claims, nil
}

// middleware to puth the user authentication information in the request context
func ParseRequest(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Println("auth middleware")
		claims, err := parseRequest(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), authKey, RequestAuthData{UserID: claims.UserID})
		nr := r.WithContext(ctx)
		h.ServeHTTP(w, nr)
	})
}

func GetRequestAuth(r *http.Request) (RequestAuthData, error) {
	authData, ok := r.Context().Value(authKey).(RequestAuthData)
	if !ok {
		return RequestAuthData{}, errors.New("no auth in request context")
	}
	return authData, nil
}
