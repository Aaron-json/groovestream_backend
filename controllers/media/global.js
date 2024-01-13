/* defines logic that is reused between multiple controller files ex. deleting a user audio file from google storage
   This is to avoid circular imports between controllers.
*/
const storage_client = require("../../cloud_storage/storage_client");
const { pipeline: pipeline_async } = require('node:stream/promises');
const { pipeline: pipeline_sync } = require("stream")
async function streamUserAudioFileToStorage(userID, fileName, readableStream, options) {

    const storageWriteStream = storage_client.bucket(process.env.USER_DATA_BUCKET).file(`${userID}/${fileName}`)
        .createWriteStream({
            contentType: options.contentType
        })
    await pipeline_async(readableStream, storageWriteStream)
}

/**
 * Delete an audioFile object from storage. This action is non-reversible.
 * Throws an error on failure
 * @param {String} userID - ID of the user which is typically the name of the bucket containing their files in storage
 * @param {String} filename - name of the file to delete, which is typically the ID of the file
 */
async function deleteAudioFileFromStorage(userID, filename) {
    // this method is for both playlist and non playlist audiofiles
    // since they are stored in the same path in storage
    return storage_client
        .bucket(process.env.USER_DATA_BUCKET)
        .file(`${userID}/${filename}`)
        .delete()
}

module.exports = {
    streamUserAudioFileToStorage,
    deleteAudioFileFromStorage
}