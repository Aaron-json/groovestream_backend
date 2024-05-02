CREATE OR REPLACE PROCEDURE removePlaylistMember(
    playlistID playlist.id%TYPE,
    userID "user".id%TYPE,
    memberID "user".id%TYPE
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if the user is the owner of the playlist
    IF NOT EXISTS (
        SELECT 1
        FROM playlist
        WHERE id = playlistID
        AND owner = userID
    ) THEN
        -- If the user is NOT the owner, raise an exception
        RAISE EXCEPTION 'Only the owner can remove members'
        USING ERRCODE = 'INV01';
    END IF;
    
    -- Delete the member's listening history from this playlist
    DELETE FROM listening_history
    WHERE user_id = memberID
    AND audiofile_id IN (
        SELECT id
        FROM audiofile
        WHERE playlist_id = playlistID
    );

    -- Remove the member from the playlist
    DELETE FROM playlist_member
    WHERE user_id = memberID
    AND playlist_id = playlistID;
END;
$$;
