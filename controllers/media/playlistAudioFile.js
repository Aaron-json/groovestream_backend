const { userModel } = require("../../db/schemas/user/userSchema");
const { updateQueryOptions } = require("../user/userController");
const { deleteAudioFileStorage } = require("./global")

async function getPlaylistAudioFileInfo(userID, audioFileID, playlistID) {

  const playlistAudioFileInfoQuery = await userModel.find({
    _id: userID,
    playlists: {
      $elemMatch: {
        _id: playlistID,
        // mongodb cannot project nested arrays based on a condition
        // get playlist and iterate
        // "audioFiles._id": audioFileID
      }
    },
  }, {
    "playlists.$": 1
  }, { lean: true })
  // since we are getting the whole playlist use lean to reduce memory use
  if (!playlistAudioFileInfoQuery[0]) {
    throw new Error("Playlist or user does not exist")
  }
  const audioFile = playlistAudioFileInfoQuery[0].playlists[0].audioFiles.find((element) => element._id === audioFileID)
  if (!audioFile) {
    throw new Error("AudioFile does not exist")
  }
  return audioFile
}
const deletePlaylistAudioFile = async (userID, audioFileID, playlistID) => {
  // do not do them in parrel to ensure data integrity.
  // Google storage does not have transactions.
  await deleteAudioFileStorage(userID, audioFileID)
  await deletePlaylistAudioFileDb(userID, playlistID, audioFileID)
};

async function savePlaylistAudioFileToDb(userID, playlistID, audioFile) {
  // the audio file is in the audioFile schema which means it lacks some of the extended
  // fields that are defined in the sharedPlaylstAudioFileSchema so we have to add them here.
  audioFile.playlistID = playlistID;
  return userModel.updateOne(
    {
      _id: userID,
      "playlists._id": playlistID,
    },
    {
      $push: {
        "playlists.$.audioFiles": audioFile,
      },
    },
    {
      ...updateQueryOptions,
    }
  );
}

async function deletePlaylistAudioFileDb(userID, playlistID, audioFileID) {
  return userModel.updateOne(
    {
      _id: userID,
      playlists: {
        $elemMatch: {
          _id: playlistID,
        },
      },
    },
    {
      $pull: {
        "playlists.$.audioFiles": {
          _id: audioFileID,
        },
      },
    },
    updateQueryOptions
  );
}

module.exports = {
  deletePlaylistAudioFile,
  deletePlaylistAudioFileDb,
  savePlaylistAudioFileToDb,
  getPlaylistAudioFileInfo,
}