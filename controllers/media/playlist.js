const { userModel } = require("../../db/schemas/user/userSchema");
const { updateQueryOptions } = require("../user/userController");
const { deleteAudioFileStorage } = require("./global");
const { deletePlaylistAudioFileDb } = require("./playlistAudioFile")

const getPlaylistInfo = async (userID, playlistID) => {
  const user = await userModel.findById(
    userID
    , {
      playlists: {
        $elemMatch: {
          _id: playlistID
        }
      }
    })
  if (!user) {
    throw new Error("user not found")
  }
  if (user.playlists.length === 0) {
    throw new Error("Playlist not found")
  }
  return user.playlists[0]

}

const deletePlaylist = async (userID, playlistID) => {
  // get the bucket and make the query to delete items
  const query = await userModel.findById(
    userID,
    {
      "playlists": {
        $elemMatch: {
          _id: playlistID,
        }
      }
    }
  );
  if (!query) {
    throw new Error("User not found")
  }
  if (query.playlists?.length === 0) {
    throw new Error("Playlist not found")
  }
  // get the playlist object to delete from the document
  const playlist = query.playlists[0];
  // delete every song in the playlist from storage then from database
  for (let i = 0; i < playlist.audioFiles.length; i++) {
    let audioFileID = playlist.audioFiles[i]._id;
    await deleteAudioFileStorage(userID, audioFileID);
    await deletePlaylistAudioFileDb(userID, playlistID, audioFileID);
  }
  // erase the whole playlist from the user playlists lists
  await userModel.updateOne(
    {
      _id: userID,
    },
    {
      $pull: {
        playlists: {
          _id: playlistID,
        },
      },
    }
  );

};

const createPlaylist = async (userID, name) => {
  const query = await userModel.updateOne(
    { _id: userID },
    {
      $push: {
        playlists: {
          name,
        },
      },
    },
    updateQueryOptions
  );

};

module.exports = {
  createPlaylist,
  deletePlaylist,
  getPlaylistInfo,
}