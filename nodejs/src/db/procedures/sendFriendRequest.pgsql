CREATE OR REPLACE PROCEDURE sendFriendRequest(
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
        RAISE EXCEPTION 'Error: User cannot send themselves a friend request'
        USING ERRCODE = 'INV02';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM friendship
        WHERE (friendship.user_1 = senderID AND friendship.user_2 = recipientID)
        OR (friendship.user_1 = recipientID AND friendship.user_2 = senderID)
    ) THEN
        RAISE EXCEPTION 'Error: Users are already friends'
        USING ERRCODE = 'INV03';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM friend_request fr
        WHERE fr."from" = senderID
        AND fr."to" = recipientID
    ) THEN
        RAISE EXCEPTION 'Error: User has already sent a friend request'
        USING ERRCODE = 'INV04';
    END IF;
    
    INSERT INTO friend_request ("from", "to")
    VALUES (senderID, recipientID);
    
END;
$$;
