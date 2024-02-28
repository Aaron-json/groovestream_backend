import { Query, getClient, queryFn } from "../../db/connection/connect.js";
import { PlaylistInvite } from "../../types/invites.js";
import { PlaylistMember } from "../../types/relations.js";

export async function sendPlaylistInvite(
  userId: number,
  email: string,
  playlistID: number
) {
  const query: Query = {
    queryStr: `
  INSERT INTO playlist_invite (playlist_id, "from", "to")
  VALUES ($1, $2, 
  (SELECT (id) FROM user WHERE
  email = $3 
  AND 
  id <> $2)
    );
  `,
    params: [playlistID, userId, email],
  };
  const res = await queryFn(query);
}
export async function acceptPlaylistInvite(
  userID: number,
  inviteID: number,
  playlistID: number
) {
  let client;
  try {
    client = await getClient();
    await client?.query("BEGIN");
    let queryStr = `
    DELETE FROM "playlist_invite"
    WHERE id = $1
    RETURNING "from";
    `;
    await client?.query(queryStr, [inviteID]);
    queryStr = `
    INSERT INTO "playlist_member" (playlist_id, user_id)
    VALUES ($1, $2)
    `;
    await client?.query(queryStr, [playlistID, userID]);
    await client?.query("COMMIT");
  } catch (error) {
    await client?.query("ROLLBACK");
    throw error;
  } finally {
    client?.release();
  }
}

export async function rejectPlaylistInvite(playlistInviteID: number) {
  await deletePlaylistInvite(playlistInviteID);
}
export async function deletePlaylistInvite(playlistInviteID: number) {
  const query: Query = {
    queryStr: `
    DELETE FROM playlist_invite
    WHERE id = $1;
    `,
    params: [playlistInviteID],
  };
  const res = await queryFn(query);
}
export async function getPlaylistInvites(userID: number) {
  const query: Query = {
    queryStr: `
    SELECT playlist_invite.*,
    invite_sender.first_name AS invite_sender_first_name,
    invite_sender.last_name AS invite_sender_last_name,
    invite_sender.id AS invite_sender_id,
    playlist_owner.first_name AS playlist_owner_first_name,
    playlist_owner.last_name AS playlist_owner_last_name,
    playlist_owner.id AS playlist_owner_id,
    playlist.name AS playlist_name,
    playlist.id AS playlist_id
    FROM playlist_invite
    JOIN "user" invite_sender ON playlist_invite.from = invite_sender.id
    JOIN playlist ON playlist_invite.playlist_id = playlist.id
    JOIN "user" playlist_owner ON playlist.owner = playlist_owner.id
    WHERE playlist_invite.to = $1
    `,
    params: [userID],
  };
  const res = await queryFn(query);
  const invites: Omit<PlaylistInvite, "to">[] = [];
  for (const invite of res.rows!) {
    invites.push(parseDbPlaylistInvite(invite));
  }
  return invites;
}
export async function removeMember(
  userID: number,
  playlistID: number,
  memberID: number
) {
  const query: Query = {
    queryStr: `
    DELETE FROM playlist_member
    JOIN playlist ON playlist_member.playlist_id = playlist.id
    WHERE 
    playlist_member.playlist_id = $1
    AND playlist.owner = $2
    AND playlist_members.user_id = $3
    `,
    params: [playlistID, userID, memberID],
  };
  const res = await queryFn(query);
}

export async function leaveSharedPlaylist(userID: number, playlistID: number) {
  const query: Query = {
    queryStr: `
    DELETE FROM playlist_member
    WHERE user_id = $1 AND
    playlist_id = $2;
    `,
    params: [userID, playlistID],
  };
  const res = await queryFn(query);
}

export async function getPlaylistMembers(playlistID: number) {
  const query: Query = {
    queryStr: `
    SELECT playlist_member.*,
    member.first_name,
    member.last_name
    FROM playlist_member
    JOIN "user" member ON playlist_member.user_id = member.id
    WHERE
    playlist_id = $1
    `,
    params: [playlistID],
  };
  const results: PlaylistMember[] = [];
  const res = await queryFn(query);
  for (const member of res.rows) {
    results.push(parseDbPlaylistMember(member));
  }
  return results;
}

export function parseDbPlaylistMember(dbPlaylistMember: any) {
  const member: PlaylistMember = {
    membershipID: dbPlaylistMember.id,
    memberID: dbPlaylistMember.user_id,
    firstName: dbPlaylistMember.member_first_name,
    lastName: dbPlaylistMember.member_last_name,
    since: dbPlaylistMember.since.toISOString(),
  };
  return member;
}

export function parseDbPlaylistInvite(dbPlaylistInvite: any) {
  const playlistInvite: Omit<PlaylistInvite, "to"> = {
    id: dbPlaylistInvite.id,
    sentAt: dbPlaylistInvite.sent_at.toISOString(),
    from: {
      id: dbPlaylistInvite.invite_sender_id,
      firstName: dbPlaylistInvite.invite_sender_first_name,
      lastName: dbPlaylistInvite.invite_sender_last_name,
    },
    playlist: {
      id: dbPlaylistInvite.playlist_id,
      name: dbPlaylistInvite.playlist_name,
      owner: {
        id: dbPlaylistInvite.playlist_owner_id,
        firstName: dbPlaylistInvite.playlist_owner_first_name,
        lastName: dbPlaylistInvite.playlist_owner_last_name,
      },
    },
  };
  return playlistInvite;
}
