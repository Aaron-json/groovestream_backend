CREATE OR REPLACE PROCEDURE sendPlaylistInvite(
    playlistID INTEGER,
    senderID INTEGER,
    recipientUsername VARCHAR(50)
)
LANGUAGE plpgsql
AS $$
DECLARE
    recipientID INTEGER;
BEGIN
    SELECT
        id INTO recipientID
    FROM
        "user"
    WHERE
        username = recipientUsername;

    IF recipientID IS NULL THEN
        RAISE EXCEPTION 'Error: User with username % not found', recipientUsername
        USING ERRCODE = 'INV01';
    END IF;

    IF recipientID = senderID THEN
        RAISE EXCEPTION 'Error: User cannot invite themselves to a playlist'
        USING ERRCODE = 'INV02';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM playlist p
        WHERE p.id = playlistID 
        AND p."owner" = recipientID
    ) THEN
        RAISE EXCEPTION 'Error: User is the owner of the playlist'
        USING ERRCODE = 'INV03';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM playlist_member pm
        WHERE pm.playlist_id = playlistID 
        AND pm.user_id = recipientID
    ) THEN
        RAISE EXCEPTION 'Error: User is already a member of the playlist'
        USING ERRCODE = 'INV04';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM playlist_invite pi
        WHERE pi.playlist_id = playlistID
        AND pi."from" = senderID
        AND pi."to" = recipientID
    ) THEN
        RAISE EXCEPTION 'Error: User has already been invited to the playlist by this sender'
        USING ERRCODE = 'INV05';
    END IF;
    
    INSERT INTO playlist_invite (playlist_id, "from", "to")
    VALUES (playlistID, senderID, recipientID);
    
END;
$$;
