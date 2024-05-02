CREATE OR REPLACE PROCEDURE acceptPlaylistInvite(
    inviteID INTEGER,
    playlistID INTEGER,
    userID INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Delete the invite by invite_id
    DELETE FROM "playlist_invite"
    WHERE id = inviteID;

    -- Check if the DELETE affected any rows
    IF NOT FOUND THEN
        -- Raise an exception if the invite was not found
        RAISE EXCEPTION 'Invite not found'
        USING ERRCODE = 'INV01';
    END IF;

    -- Delete all invites related to the playlist
    DELETE FROM "playlist_invite"
    WHERE playlist_id = playlistID;

    -- Insert the user into the playlist
    INSERT INTO "playlist_member" (playlist_id, user_id)
    VALUES (playlistID, userID);
END;
$$;