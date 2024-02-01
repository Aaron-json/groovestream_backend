const mongoose = require("mongoose")
const { userModel } = require("../../db/schemas/user/userSchema")
const { deletePlaylistAudioFileDb } = require("./playlistAudioFile")
const storageClient = require("../../cloud_storage/storage_client")
/**
 * Due to a previous known bug, it was possible to delete a playlist audiofile from storage
 * but not from the database. This functions checks all user audio files in the database and deletes
 * those that are not in storage.
 * @param {string} userID
 */
async function cleanUp(userID) {
    try {

        const user = await userModel.findById(userID, {
            "playlists._id": 1,
            "playlists.audioFiles": 1,
            "playlists.name": 1,
        }, { lean: true })

        for (const playlist of user.playlists) {
            for (const audioFile of playlist.audioFiles) {
                console.log(playlist.name, audioFile.filename)
                const exists = await storageClient.bucket(process.env.USER_DATA_BUCKET).file(`${userID}/${audioFile._id}`).exists()
                if (!exists[0]) {
                    await deletePlaylistAudioFileDb(userID, playlist._id, audioFile._id)
                    console.log(`Song ${audioFile.filename} from ${playlist.name} deleted`)
                }
            }

        }

    } catch (error) {

    }
}

async function removeIdleUsers() {
    const users = await userModel.find({
        sharedPlaylists: {
            $size: 0
        },
        playlists: {
            $size: 1
        },
        audioFiles: {
            $size: 0,
        }
    }, {
        firstName: 1,
        lastName: 1,
        email: 1,
    })
    for (const user of users) {

        console.log(user)
    }
}
removeIdleUsers()
module.exports = {
    cleanUp
}