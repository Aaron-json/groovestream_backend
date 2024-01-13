const { userModel } = require("../../db/schemas/user/userSchema")
const storage_client = require("../../cloud_storage/storage_client")
const { pipeline: pipeline_async } = require('node:stream/promises');
const { sharedPlaylistModel } = require("../../db/schemas/media/sharedPlaylist");
const mongoose = require("mongoose");
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

async function deleteSharedPlaylistAudioFile(req, res) {
  const { playlistID, audioFileID } = req.params;

  try {
    await deleteSharedPlaylistAudioFileFromStorage(playlistID, audioFileID);
    await deleteSharedPlaylistAudioFileFromDb(playlistID, audioFileID);
    res.sendStatus(200);
  } catch (e) {
    res.status(500).json(e);
  }
}

async function deleteSharedPlaylistAudioFileFromDb(playlistID, audioFileID, session) {
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

async function deleteSharedPlaylistAudioFileFromStorage(playlistID, audioFileID) {
  return storage_client.bucket(process.env.GLOBAL_AUDIOFILES_BUCKET).file(`${playlistID}/${audioFileID}`)
    .delete()
}

async function deleteSharedPlaylistAudioFileHelper(playlistID, audioFileID, session) {
  /*
    Helper function to do deleting from storage and from database as one function.
    Convenience if needed ot export this functionality.
    Internal functions can call the two functions independently if preferred.
  */
  await deleteSharedPlaylistAudioFileFromStorage(playlistID, audioFileID);
  await deleteSharedPlaylistAudioFileFromDb(playlistID, audioFileID, session);
}

async function downloadSharedPlaylistAudioFile(req, res) {
  const { playlistID, audioFileID } = req.params;
  try {
    const file = storage_client
      .bucket(process.env.GLOBAL_AUDIOFILES_BUCKET)
      .file(`${playlistID}/${audioFileID}`);
    const metadataPromise = file.getMetadata();
    const audioFileDataPromise = file.download();
    const [metadata, audioFileData] = await Promise.all([metadataPromise, audioFileDataPromise]);
    const contentType = metadata[0].contentType;
    res.setHeader("Content-Type", contentType);
    const base64EncodedAudio = audioFileData[0].toString("base64");
    res.send(base64EncodedAudio);
  } catch (err) {
    return res.status(500).send(err);
  }
}

module.exports = {
  getSharedPlaylistAudioFileInfo,
  saveSharedPlaylistAudioFileToDb,
  streamSharedPlaylistAudioFileToStorage,
  deleteSharedPlaylistAudioFile,
  downloadSharedPlaylistAudioFile,
  deleteSharedPlaylistAudioFileHelper
}