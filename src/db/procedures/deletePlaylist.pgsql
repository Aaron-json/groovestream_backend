CREATE OR REPLACE PROCEDURE deletePlaylist(
    playlistID INTEGER,
    userID INTEGER
)
LANGUAGE plpgsql
AS $$
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
    
    DELETE FROM audiofile WHERE playlist_id = playlistID;
    DELETE FROM playlist WHERE id = playlistID;
END;
$$;