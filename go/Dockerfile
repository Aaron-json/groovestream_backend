FROM golang:1.22

WORKDIR /usr/src/app

COPY ./ ./ 
RUN go mod download && go mod verify

RUN go build -v -o ./cmd/main ./cmd/main.go 

EXPOSE 8080
CMD ["./cmd/main"]