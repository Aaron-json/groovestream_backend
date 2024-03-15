CREATE OR REPLACE PROCEDURE leavePlaylist(
userID "user".id%type,
playlistID playlist.id%type,
)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM listening_history
    WHERE user_id = userID
    AND audiofile_id IN (
        SELECT id
        FROM audiofile
        WHERE playlist_id = playlistID
    );
    
    DELETE FROM playlist_member
    WHERE user_id = $1 AND
    playlist_id = $2;
END;
$$;