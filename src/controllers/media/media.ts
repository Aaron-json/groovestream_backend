/**
 * Defines all controllers for requests and functionalities that spans across all media types.
 * Also has reusable functionality that is the same for multiple media types
 * Ex. downloading a user's audio file. These are stores in the sama path in storage
 */
import { Query, queryFn } from "../../db/connection/connect.js";
import { AudioFile } from "../../types/media.js";
import { parseDbAudioFile } from "./audioFile.js";
export async function mostPlayedAudioFiles(userID: number, limit: number) {
  const query: Query = {
    queryStr: `
    SELECT
    audiofile.*,
    uploader.username AS uploaded_by_username,
    COUNT(*) AS playback_count
     FROM audiofile
     JOIN listening_history ON audiofile.id = listening_history.audiofile_id
     JOIN "user" uploader ON audiofile.uploaded_by = uploader.id
     WHERE listening_history.user_id = $1
     GROUP BY audiofile.id, uploaded_by_username
     LIMIT $2
    `,
    params: [userID, limit],
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

export async function getListeningHistory(
  userID: number,
  limit: number,
  skip?: number
) {
  if (skip === undefined) {
    skip = 0;
  }

  const query: Query = {
    queryStr: `
    SELECT audiofile.*,
    uploader.username AS uploaded_by_username
    FROM listening_history lh
    JOIN audiofile ON audiofile.id = lh.audiofile_id
    JOIN "user" uploader ON audiofile.uploaded_by = uploader.id
    WHERE lh.user_id = $1
    GROUP BY audiofile.id, uploaded_by_username
    ORDER BY max(lh.played_at) DESC
    LIMIT $2 OFFSET $3;
    `,
    params: [userID, limit, skip],
  };
  const resutls: AudioFile[] = [];
  const res = await queryFn(query);
  for (const row of res?.rows!) {
    const audiofile = parseDbAudioFile(row);
    resutls.push(audiofile);
  }
  return resutls;
}

export async function addListeningHistory(userID: number, audioFileID: number) {
  const query: Query = {
    queryStr: `
    INSERT INTO "listening_history" (user_id, audiofile_id)
    VALUES ($1, $2);
    `,
    params: [userID, audioFileID],
  };
  await queryFn(query);
}
