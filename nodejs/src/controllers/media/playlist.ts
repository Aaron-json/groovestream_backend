import { deleteAudioFileStorage } from "./audioFile.js";
import { AudioFile, MediaType, Playlist } from "../../util/types/media.js";
import { Query, queryFn } from "../../db/connection/connect.js";
import { parseDbAudioFile } from "./audioFile.js";

export async function getPlaylistInfo(playlistID: number): Promise<Playlist> {
  const query: Query = {
    queryStr: `SELECT playlist.*,
    owner.username AS owner_username
    FROM playlist
    JOIN user "owner" ON playlist.owner = owner.id
    WHERE playlist.id = $1;
    `,
    params: [playlistID],
  };
  const response = await queryFn(query);
  const dbPlaylist = response.rows[0];
  return parseDbPlaylist(dbPlaylist);
}
export async function getPlaylistAudioFiles(playlistID: number, searchText?: string | undefined) {
  let params;
  let searchQuery;
  if (searchText) {
    params = [playlistID, searchText]
    searchQuery = `
    AND "search" @@ websearch_to_tsquery($2)
    `
  } else {
    params = [playlistID]
    searchQuery = ''
  }
  const query: Query = {
    queryStr: `
    SELECT audiofile.*,
    uploader.username AS uploaded_by_username
    FROM audiofile
    JOIN "user" uploader ON audiofile.uploaded_by = uploader.id
    WHERE playlist_id = $1
    ${searchQuery}
    ;
    `,
    params,
  };
  const dbAudioFiles = (await queryFn(query)).rows;
  const audiofiles: AudioFile[] = [];
  for (const dbAudioFile of dbAudioFiles) {
    audiofiles.push(parseDbAudioFile(dbAudioFile));
  }
  return audiofiles;
}
export function parseDbPlaylist(dbPlaylist: any) {
  const playlist: Playlist = {
    id: dbPlaylist.id,
    type: MediaType.Playlist,
    name: dbPlaylist.name,
    owner: {
      id: dbPlaylist.owner,
      username: dbPlaylist.owner_username,
    },
    createdAt: dbPlaylist.created_at.toISOString(),
  };
  return playlist;
}
export async function deletePlaylist(userID: number, playlistID: string) {
  // playlist members will cascade after playlist is deleted
  const query = {
    queryStr: `
    SELECT storage_id FROM deletePlaylist($1, $2)
    `,
    params: [playlistID, userID],
  };

  const res = await queryFn(query);
  for (const row of res.rows) {
    // delete all songs from storage
    await deleteAudioFileStorage(row.storage_id);
  }
}

export async function createPlaylist(userID: number, name: string) {
  const query: Query = {
    queryStr: `
    INSERT INTO "playlist" (name, owner)
    VALUES ($1, $2);
    `,
    // for non-shared playlsists, owner and created_by will reference the same user
    // for shared playlists, created_by will reference the original owner while owner will reference,
    // the current owner
    params: [name, userID],
  };
  const res = await queryFn(query);
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
/**
 * @param {string} userID
 * @returns Array of all the user's playlists
 */
export async function getAllUserPlaylists(userID: number, searchText?: string | undefined) {
  let searchQuery;
  let params;
  if (searchText) {
    params = [userID, searchText]
    searchQuery = `
    AND "search" @@ websearch_to_tsquery($2)
    `
  } else {
    searchQuery = ''
    params = [userID]
  }
  const playlistQuery: Query = {
    queryStr: `
    SELECT playlist.*,
    owner.username AS owner_username
    FROM playlist
    JOIN "user" owner ON playlist.owner = owner.id
    WHERE
    (
    playlist.owner = $1
    OR
    playlist.id IN  
      (SELECT playlist_id FROM playlist_member
      WHERE user_id = $1
      )
    )
    ${searchQuery}
    ;
    `,
    params,
  };
  const res = await queryFn(playlistQuery);
  const playlists: Playlist[] = [];
  for (const playlist of res.rows) {
    playlists.push(parseDbPlaylist(playlist));
  }
  return playlists;
}
