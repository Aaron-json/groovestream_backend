package db

import "time"

// This is the audiofile type that is read from the database, not neccessarily the right shape
// to send back to the user
type DbAudioFile struct {
	Id           int       `db:"id"`
	StorageId    string    `db:"storage_id"`
	Filename     string    `db:"filename"`
	UploadedAt   time.Time `db:"uploaded_at"`
	UploadedBy   int64     `db:"uploaded_by"`
	PlaylistId   int64     `db:"playlist_id"`
	Title        *string   `db:"title"`
	Album        *string   `db:"album"`
	Artists      []string  `db:"artists"`
	Duration     *float32  `db:"duration"`
	TrackNumber  *int      `db:"track_number"`
	TrackTotal   *int      `db:"track_total"`
	Genre        *string   `db:"genre"`
	MimeType     string    `db:"mime_type"`
	Bitrate      *int      `db:"bitrate"`
	Channels     *int      `db:"channels"`
	Codec        *string   `db:"codec"`
	Container    *string   `db:"container"`
	SampleRate   *int      `db:"sample_rate"`
	Icon         []byte    `db:"icon"`
	IconMimeType *string   `db:"icon_mime_type"`
}
