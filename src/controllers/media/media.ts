/**
 * Defines all controllers for requests and functionalities that spans across all media types.
 * Also has reusable functionality that is the same for multiple media types
 * Ex. downloading a user's audio file. These are stores in the sama path in storage
 */
import { Query, queryFn } from "../../db/connection/connect.js";
import { AudioFile, Playlist } from "../../types/media.js";
import { parseDbAudioFile } from "./audioFile.js";
import { parseDbPlaylist } from "./playlist.js";
/**
 * @param {string} userID
 * @returns Array of all media that the user has in their library
 */
export async function getAllUserMedia(userID: number) {
  const params = [userID];
  const audioFileQuery: Query = {
    queryStr: `
    SELECT audiofile.*,
    uploader.first_name AS uploaded_by_first_name,
    uploader.first_name AS uploaded_by_first_name
    FROM audiofile
    JOIN "user" uploader ON audiofile.uploaded_by = uploader.id
    WHERE 
    (type = 0 AND uploaded_by = $1)
    `,
    params,
  };
  const playlistQuery: Query = {
    queryStr: `
    SELECT playlist.*,
    owner.first_name AS owner_first_name,
    owner.last_name AS owner_last_name
    FROM playlist
    JOIN "user" owner On playlist.owner = owner.id
    WHERE 
    (playlist.type = 1 AND playlist.owner = $1)
    OR
    (playlist.type = 3 AND playlist.owner = $1)
    OR
    (playlist.id IN  
      (SELECT (playlist_id) FROM playlist_member
      WHERE user_id = $1
      )
      );
    `,
    params,
  };
  const [audioFileRes, playlistRes] = await Promise.all([
    queryFn(audioFileQuery),
    queryFn(playlistQuery),
  ]);
  const audioFiles = audioFileRes!.rows;
  const playlists = playlistRes!.rows;
  const allMedia: (AudioFile | Playlist)[] = [];
  for (const audioFile of audioFiles) {
    allMedia.push(parseDbAudioFile(audioFile));
  }
  for (const playlist of playlists) {
    allMedia.push(parseDbPlaylist(playlist));
  }
  return allMedia;
}

export async function mostPlayedAudioFiles(userID: number) {
  const query: Query = {
    queryStr: `
    SELECT
    audiofile.*,
    uploader.first_name AS uploaded_by_first_name,
    uploader.last_name AS uploaded_by_last_name,
    COUNT(audiofile.id) AS playback_count
     FROM audiofile
     JOIN listening_history ON audiofile.id = listening_history.audiofile_id
     JOIN "user" uploader ON audiofile.uploaded_by = uploader.id
     WHERE listening_history.user_id = $1
     GROUP BY audiofile.id, uploaded_by_first_name, uploaded_by_last_name
    `,
    params: [userID],
  };
  const res = await queryFn(query);
  const rows = res?.rows!;
  const results: AudioFile[] = [];
  for (const row of rows) {
    const audiofile = parseDbAudioFile(row);
    results.push(audiofile);
  }
  return results;
}

export async function listeningHistory(
  userID: number,
  skip?: number,
  limit?: number
) {
  let skipQuery;
  if (limit === undefined || skip === undefined) {
    skipQuery = "";
  } else {
    skipQuery = `LIMIT ${limit} OFFSET ${skip}`;
  }
  const query: Query = {
    queryStr: `
    SELECT audiofile.*,
    uploader.first_name AS uploaded_by_first_name,
    uploader.last_name AS uploaded_by_last_name
    FROM listening_history
    jOIN audiofile ON listening_history.audiofile_id = audiofile.id
    JOIN "user" uploader ON audiofile.uploaded_by = uploader.id
    WHERE listening_history.user_id = $1
    ORDER BY listening_history.played_at DESC
    ${skipQuery}
    `,
    params: [userID],
  };
  const resutls: AudioFile[] = [];
  const res = await queryFn(query);
  for (const row of res?.rows!) {
    const audiofile = parseDbAudioFile(row);
    resutls.push(audiofile);
  }
  return resutls;
}
