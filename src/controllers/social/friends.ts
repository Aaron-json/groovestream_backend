import { Query, queryFn } from "../../db/connection/connect.js";
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
    friend.username
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
    sender.username AS from_username
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

export async function sendFriendRequest(userID: number, username: string) {
  const queryStr = `
  CALL sendFriendRequest($1, $2)
  `;
  const query: Query = {
    queryStr,
    params: [userID, username],
  };
  const res = await queryFn(query);
}

export async function acceptFriendRequest(
  userID: number,
  requestID: number,
  senderID: number
) {
  const query: Query = {
    queryStr: `
    CALL acceptFriendRequest($1, $2, $3)
    `,
    params: [userID, senderID, requestID],
  };
  const res = await queryFn(query);
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
 * username
 * @param dbFriend friend request from the database
 * @returns array of friend requests in their appropriate shape
 */
export function parseDbFriend(dbFriend: any) {
  const friend: Friend = {
    friendshipID: dbFriend.id,
    friendID: dbFriend.user_id,
    username: dbFriend.username,
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
      username: dbFriendRequest.from_username,
    },
    sentAt: dbFriendRequest.sent_at.toISOString(),
  };

  return frReq;
}
