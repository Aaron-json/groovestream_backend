CREATE OR REPLACE PROCEDURE leavePlaylist(
    userID "user".id%TYPE,
    playlistID playlist.id%TYPE
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if the user is the owner of the playlist
    IF EXISTS (
        SELECT 1
        FROM playlist
        WHERE id = playlistID
        AND owner = userID
    ) THEN
        -- If the user is the owner, raise an exception
        RAISE EXCEPTION 'The owner cannot leave a playlist'
        USING ERRCODE = 'INV01';
    END IF;
    
    -- Delete the user's listening history for the playlist's audio files
    DELETE FROM listening_history
    WHERE user_id = userID
    AND audiofile_id IN (
        SELECT id
        FROM audiofile
        WHERE playlist_id = playlistID
    );

    -- Remove the user from the playlist
    DELETE FROM playlist_member
    WHERE user_id = userID
    AND playlist_id = playlistID;
END;
$$;
