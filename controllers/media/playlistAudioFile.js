const { userModel } = require("../../db/schemas/user/userSchema");
const { updateQueryOptions } = require("../user/userController");
const { deleteAudioFileFromStorage } = require("./global")

async function getPlaylistAudioFileInfo(req, res) {
  const { userID } = req;
  const { playlistID, audioFileID } = req.params;
  try {
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
    }).lean()
    // since we are getting the whole playlist use lean to reduce memory use
    if (!playlistAudioFileInfoQuery[0]) {
      return res.status(404).json({ message: "Playlist or user does not exist" })
    }
    const audioFile = playlistAudioFileInfoQuery[0].playlists[0].audioFiles.find((element) => element._id === audioFileID)
    if (!audioFile) {
      return res.status(404).json({ message: "AudioFile does not exist" })
    }
    res.json(audioFile)
  } catch (error) {
    res.status(500).json(error);
  }
}

const deletePlaylistAudioFile = async (req, res) => {
  const { userID } = req;
  const { audioFileID, playlistID } = req.params;
  try {
    // delete file from cloud storage
    await deleteAudioFileFromStorage(userID, audioFileID);
  } catch (e) {
    return res.status(500).send(e);
  }
  // only if deleting file from storage was successful
  // delete it from storage

  try {
    // delete from root
    await deletePlaylistAudioFileFromDb(userID, playlistID, audioFileID);

    res.sendStatus(200);
  } catch (error) {
    res.send(error);
  }
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

async function deletePlaylistAudioFileFromDb(userID, playlistID, audioFileID) {
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
  savePlaylistAudioFileToDb,
  getPlaylistAudioFileInfo,
}