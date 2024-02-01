const { userModel } = require("../../db/schemas/user/userSchema")
const storage_client = require("../../cloud_storage/storage_client")
const { pipeline: pipeline_async } = require('node:stream/promises');
const { sharedPlaylistModel } = require("../../db/schemas/media/sharedPlaylist");
async function getSharedPlaylistAudioFileInfo(req, res) {
  const { userID } = req;
  const { playlistID, audioFileID } = req.params;
  const sharedPlaylistAudioFileQuery = await userModel.find({ _id: userID }, {
    "sharedPlaylists": 1
  })
    .populate("sharedPlaylists", {
      audioFiles: 1
    })
}

async function streamSharedPlaylistAudioFileToStorage(playlistID, audioFileID, audioStream, options) {
  const writeStream = storage_client.bucket(process.env.GLOBAL_AUDIOFILES_BUCKET).file(`${playlistID}/${audioFileID}`).createWriteStream(
    {
      contentType: options.contentType,
    }
  )
  await pipeline_async(audioStream, writeStream);
}

async function saveSharedPlaylistAudioFileToDb(playlistID, audioFile, userID) {
  // the audio file is in the audioFile schema which means it lacks some of the extended
  // fields that are defined in the sharedPlaylstAudioFileSchema so we have to add them here.
  audioFile.playlistID = playlistID;
  audioFile.uploadedBy = {
    memberID: userID
  }
  return sharedPlaylistModel.updateOne({
    _id: playlistID
  }, {
    $push: {
      audioFiles: audioFile,
    }
  })
}

async function deleteSharedPlaylistAudioFile(userID, audioFileID, playlistID) {
  // TODO: Add member / owner checks for added authentication
  try {
    await deleteSharedPlaylistAudioFileStorage(playlistID, audioFileID);
    await deleteSharedPlaylistAudioFileDb(playlistID, audioFileID);
    res.sendStatus(200);
  } catch (e) {
    res.status(500).json(e);
  }
}

async function deleteSharedPlaylistAudioFileDb(playlistID, audioFileID, session) {
  return sharedPlaylistModel.updateOne({
    _id: playlistID
  }, {
    $pull: {
      audioFiles: {
        _id: audioFileID
      }
    }
  }, { session })
}

async function deleteSharedPlaylistAudioFileStorage(playlistID, audioFileID) {
  return storage_client.bucket(process.env.GLOBAL_AUDIOFILES_BUCKET).file(`${playlistID}/${audioFileID}`)
    .delete()
}

async function deleteSharedPlaylistAudioFileHelper(playlistID, audioFileID, session) {
  /*
    Helper function to do deleting from storage and from database as one function.
    Convenience if needed ot export this functionality.
    Internal functions can call the two functions independently if preferred.
  */
  await deleteSharedPlaylistAudioFileStorage(playlistID, audioFileID);
  await deleteSharedPlaylistAudioFileDb(playlistID, audioFileID, session);
}

module.exports = {
  getSharedPlaylistAudioFileInfo,
  saveSharedPlaylistAudioFileToDb,
  streamSharedPlaylistAudioFileToStorage,
  deleteSharedPlaylistAudioFile,
  deleteSharedPlaylistAudioFileHelper
}