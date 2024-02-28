import { Query, getClient, queryFn } from "../../db/connection/connect.js";
import { Friend } from "../../types/relations.js";
import { FriendRequest } from "../../types/invites.js";

export async function getFriends(
  userID: number,
  limit?: number,
  skip?: number
) {
  const query: Query = {
    queryStr: `
    SELECT friendship.*,
    friend.first_name,
    friend.last_name,
    friend.email
    FROM "friendship"
    JOIN "user" friend ON friend.id =
    CASE
      WHEN friendship.user_1 = $1
      THEN friendship.user_2
      ELSE friendship.user_1
    END
    WHERE
    user_1 = $1
    OR
    user_2 = $1
    `,
    params: [userID],
  };
  const res = await queryFn(query);
  const dbFriends = res.rows;
  const result: Friend[] = [];
  for (const friend of dbFriends) {
    result.push(parseDbFriend(friend));
  }
  return result;
}

export async function getFriendRequests(userID: number) {
  const query: Query = {
    queryStr: `
    SELECT friend_request.*,
    sender.first_name AS from_first_name,
    sender.last_name AS from_last_name
    FROM
    "friend_request"
    JOIN "user" sender ON friend_request.from = sender.id
    WHERE "to" = $1
    `,
    params: [userID],
  };
  const res = await queryFn(query);
  const results: Omit<FriendRequest, "to">[] = [];
  for (const dbFriendRequest of res.rows) {
    results.push(parseDbFriendRequest(dbFriendRequest));
  }
  return results;
}

export async function sendFriendRequest(userID: number, email: string) {
  const query: Query = {
    queryStr: `
    INSERT INTO friend_request ("from", "to")
    VALUES ($1,
    (SELECT (id) FROM user WHERE
    email = $2 
    AND 
    id <> $1)
    );
    `,
    params: [userID, email],
  };
  const res = await queryFn(query);
}

export async function acceptFriendRequest(userID: number, requestID: number) {
  let client;
  try {
    client = await getClient();
    await client?.query("BEGIN");
    let queryStr = `
    DELETE FROM "friend_request"
    WHERE id = $1
    RETURNING "from";
    `;
    const res = await client?.query(queryStr, [requestID]);
    queryStr = `
    INSERT INTO "friendship" (user_1, user_2)
    VALUES ($1, $2)
    `;
    await client?.query(queryStr, [res?.rows[0].from, userID]);
    await client?.query("COMMIT");
  } catch (error) {
    await client?.query("ROLLBACK");
    throw error;
  } finally {
    client?.release();
  }
}

export async function deleteFriendRequest(friendRequestID: number) {
  const query: Query = {
    queryStr: `
    DELETE FROM friend_request
    WHERE id = $1;
    `,
    params: [friendRequestID],
  };
  const res = await queryFn(query);
}

export async function deleteFriend(friendshipID: number) {
  const query: Query = {
    queryStr: `
    DELETE FROM friendship
    WHERE id = $1;
    `,
    params: [friendshipID],
  };
  const res = await queryFn(query);
}
/**
 * Parses friend row from the database and returns them.
 * Expects the object to also have the friend's following fields:
 * first_name, last_name, email
 * @param dbFriend friend request from the database
 * @returns array of friend requests in their appropriate shape
 */
export function parseDbFriend(dbFriend: any) {
  const friend: Friend = {
    friendshipID: dbFriend.id,
    friendID: dbFriend.user_id,
    email: dbFriend.email,
    firstName: dbFriend.first_name,
    lastName: dbFriend.last_name,
    since: dbFriend.since.toISOString(),
  };
  return friend;
}
/**
 * Parses friend requests from the database and returns them.
 * Expects the object to also have the sender's following fields:
 * from_first_name, from_last_name
 * @param dbFriendRequest friend request from the database
 * @returns array of friend requests in their appropriate shape
 */
export function parseDbFriendRequest(dbFriendRequest: any) {
  const frReq: Omit<FriendRequest, "to"> = {
    id: dbFriendRequest.id,
    from: {
      id: dbFriendRequest.from,
      firstName: dbFriendRequest.from_first_name,
      lastName: dbFriendRequest.from_last_name,
    },
    sentAt: dbFriendRequest.sent_at.toISOString(),
  };

  return frReq;
}
