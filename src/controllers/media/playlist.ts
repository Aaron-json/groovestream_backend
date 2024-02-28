import { deleteAudioFileStorage } from "./audioFile.js";
import { Playlist } from "../../types/media.js";
import { Query, queryFn } from "../../db/connection/connect.js";
import { parseDbAudioFile } from "./audioFile.js";

export async function getPlaylistInfo(playlistID: number): Promise<Playlist> {
  const query: Query = {
    queryStr: `SELECT playlist.*,
    owner.first_name AS owner_first_name,
    owner.last_name AS owner_last_name
    FROM playlist
    JOIN user "owner" ON playlist.owner = owner.id
    WHERE playlist.id = $1;
    `,
    params: [playlistID],
  };
  const response = await queryFn(query);
  const dbPlaylist = response?.rows[0];
  return parseDbPlaylist(dbPlaylist);
}
export async function getPlaylistAudioFiles(playlistID: number) {
  const query: Query = {
    queryStr: `
    SELECT audiofile.*,
    uploader.first_name AS uploaded_by_first_name,
    uploader.last_name AS uploaded_by_last_name
    FROM audiofile
    JOIN "user" uploader ON audiofile.uploaded_by = uploader.id
    WHERE playlist_id = $1;
    `,
    params: [playlistID],
  };
  const dbAudioFiles = (await queryFn(query))!.rows;
  const audiofiles = [];
  for (const dbAudioFile of dbAudioFiles) {
    audiofiles.push(parseDbAudioFile(dbAudioFile));
  }
  return audiofiles;
}
export function parseDbPlaylist(dbPlaylist: any) {
  const playlist: Playlist = {
    id: dbPlaylist.id,
    name: dbPlaylist.name,
    type: dbPlaylist.type,
    owner: {
      id: dbPlaylist.owner,
      firstName: dbPlaylist.owner_first_name,
      lastName: dbPlaylist.owner_last_name,
    },
    createdAt: dbPlaylist.created_at.toISOString(),
  };
  return playlist;
}
export async function deletePlaylist(userID: number, playlistID: string) {
  // for playlist members, they will cascade after playlist
  // is deleted.
  let query: Query = {
    queryStr: `
    SELECT storage_id from "audiofile"
    WHERE playlist_id = $1
    `,
    params: [playlistID],
  };
  let res = await queryFn(query);
  for (const row of res?.rows!) {
    // delete all songs from storage
    await deleteAudioFileStorage(row.storage_id);
  }
  query = {
    // delete using a transaction to maintain data integrity
    queryStr: `
    BEGIN;
    DELETE FROM audiofiles WHERE playlist_id = $1;
    DELETE FROM playlists WHERE id = $1;
    COMMIT;
    `,
    params: [playlistID],
  };
  res = await queryFn(query);
}

export async function createPlaylist(
  userID: number,
  name: string,
  type: Playlist["type"]
) {
  const query: Query = {
    queryStr: `
    INSERT INTO "playlist" (name, type, owner)
    VALUES ($1, $2, $3)
    `,
    // for non-shared playlsists, owner and created_by will reference the same user
    // for shared playlists, created_by will reference the original owner while owner will reference,
    // the current owner
    params: [name, type, userID],
  };
}

export async function changePlaylistName(playlistID: number, newName: string) {
  const query: Query = {
    queryStr: `
    UPDATE "playlist"
    SET name = $1,
    WHERE id = $2
    `,
    params: [newName, playlistID],
  };
  const res = await queryFn(query);
}
