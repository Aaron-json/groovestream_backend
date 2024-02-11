/* defines logic that is reused between multiple controller files ex. deleting a user audio file from google storage
   This is to avoid circular imports between controllers.
*/
import storageClient from "../../cloud_storage/storage_client.js";
import { pipeline as pipeline_async } from "node:stream/promises";
import { pipeline as pipeline_sync } from "stream";
import { Readable } from "node:stream";
export async function streamUserAudioFileToStorage(
  userID: string,
  fileName: string,
  readableStream: Readable,
  options: any
) {
  const storageWriteStream = storageClient
    .bucket(process.env.USER_DATA_BUCKET)
    .file(`${userID}/${fileName}`)
    .createWriteStream({
      contentType: options.contentType,
    });
  await pipeline_async(readableStream, storageWriteStream);
}

/**
 * Delete an audioFile object from storage. This action is non-reversible.
 * Throws an error on failure
 * @param {String} userID - ID of the user which is typically the name of the bucket containing their files in storage
 * @param {String} filename - name of the file to delete, which is typically the ID of the file
 */
export async function deleteAudioFileStorage(userID: string, filename: string) {
  // this method is for both playlist and non playlist audiofiles
  // since they are stored in the same path in storage
  return storageClient
    .bucket(process.env.USER_DATA_BUCKET)
    .file(`${userID}/${filename}`)
    .delete();
}
