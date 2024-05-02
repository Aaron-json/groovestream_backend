CREATE OR REPLACE FUNCTION deletePlaylist(
    playlistID playlist.id%type,
    userID "user".id%type
)
RETURNS SETOF audiofile AS
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM playlist
        WHERE id = playlistID
        AND "owner" = userID
    ) THEN
        RAISE EXCEPTION 'Error: Only the owner is allowed to delete this playlist.'
        USING ERRCODE = 'INV01';
    END IF;

    -- Delete related audio files
    RETURN QUERY
    DELETE FROM audiofile WHERE playlist_id = playlistID
    RETURNING *;

    -- Delete the playlist
    DELETE FROM playlist WHERE id = playlistID;
END;
$$ LANGUAGE plpgsql;
