const {userModel} = require("../../db/schemas/user/userSchema");
const {updateQueryOptions} = require("../user/userController");
const {deleteAudioFileFromDb, deleteAudioFileFromStorage} = require("./audioFile")


const getPlaylistInfo = async (req, res) => {
  const {userID} = req;
  const {playlistID} = req.params;
  try {
    const playlistInfoQuery = await userModel.find({
      _id: userID,
      "playlists._id": playlistID
    }, {
      'playlists.$': 1
    })
    res.json(playlistInfoQuery[0].playlists[0])
  } catch (error) {
    res.status(400).send(error)
  }
}

const deletePlaylist = async (req, res) => {
  const {userID} = req;
  const {playlistID} = req.params;

  try {
    // get the bucket and make the query to delete items
    const query = await userModel.findOne(
      {
        _id: userID,
        playlists: {
          $elemMatch: {
            _id: playlistID,
          },
        },
      },
      {"playlists.$": 1, _id: 0}
    );
    // get the playlist object to delete from the document
    const playlist = query.playlists[0];
    // delete every song in the playlist from storage then from database
    for (let i = 0; i < playlist.audioFiles.length; i++) {
      let fileToDeleteID = playlist.audioFiles[i]._id;
      await deleteAudioFileFromStorage(userID, fileToDeleteID);
      await deleteAudioFileFromDb(2, userID, fileToDeleteID, playlistID);
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
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
};

const createPlaylist = async (req, res) => {
  const {userID} = req;
  const {name} = req.body;
  console.log(name);
  try {
    const query = await userModel.updateOne(
      {_id: userID},
      {
        $push: {
          playlists: {
            name,
          },
        },
      },
      updateQueryOptions
    );
    res.sendStatus(201);
  } catch (err) {
    res.send(err);
  }
};

module.exports = {
  createPlaylist,
  deletePlaylist,
  getPlaylistInfo,
}