const mongoose = require("mongoose");
const {
  sharedPlaylistModel,
} = require("../../db/schemas/media/sharedPlaylist");
const {userModel} = require("../../db/schemas/user/userSchema");
const {friendExists} = require("../social/friendsController");

async function createSharedPlaylist(req, res) {
  const {userID} = req;
  const {name} = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const newSharedPlaylist = await sharedPlaylistModel.create([{
      name,
      owner: userID,
    }], {session});

    await userModel.updateOne({_id: userID}, {
      $push: {
        sharedPlaylists: newSharedPlaylist[0]._id
      }
    }, {session})
    res.status(201).json(newSharedPlaylist);
  } catch (error) {
    res.sendStatus(500);
    await session.abortTransaction();
  } finally {
    await session.endSession();
  }
}

async function isOwner(userID, sharedPlaylistID) {
  const playlist = await sharedPlaylistModel.findById(sharedPlaylistID, {owner: 1});
  return playlistQuery?.owner === userID;
}

async function addMemberToSharedPlaylist(req, res) {
  const {userID} = req;
  const {playlistID} = req.params;
  const {memberEmail} = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    //get member's id from database to add to database.
    const memberIDQuery = userModel.findOne({email: memberEmail});
    const playlistQuery = sharedPlaylistModel.findById(playlistID);
    let [memberIDResponse, playlist] = await Promise.all([
      memberIDQuery,
      playlistQuery,
    ]);
    if (!memberIDResponse || !playlist) {
      throw new Error("User or Playlist not found");
    }
    if (!friendExists(userID, memberIDResponse._id)) {
      throw new Error("You are not friends with this user.")
    }
    playlist.members.push(memberIDResponse._id);
    memberIDResponse.sharedPlaylists.push(playlist._id);
    await Promise.all([playlist.save({session}), memberIDResponse.save({session})]);
    await session.commitTransaction();
    res.sendStatus(204);
  } catch (error) {
    res.status(500).send(error);
    await session.abortTransaction();
  } finally {
    await session.endSession();
  }
}

async function removeMemberFromSharedPlaylist(req, res) {

  const {userID} = req;
  const {playlistID, memberID} = req.params;
  //  TODO: Implement logic to remove member from shared playlist
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const deletePlaylistFromMemberQuery = userModel.updateOne({_id: memberID}, {
      $pull: {
        sharedPlaylists: playlistID
      }
    }, {session})
    const deleteMemberFromPlaylistQuery = sharedPlaylistModel.updateOne({_id: playlistID}, {
      $pull: {
        members: memberID
      }
    }, {session})

    await Promise.all([deleteMemberFromPlaylistQuery, deletePlaylistFromMemberQuery]);

    await session.commitTransaction();
  } catch (e) {
    res.send(500).json(e);
    await session.abortTransaction();
  } finally {
    await session.endSession();
  }
}

async function leaveSharedPlaylist() {
  const {userID} = req;
  const {playlistID} = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await userModel.updateOne({_id: userID}, {
      $pull: {
        sharedPlaylists: playlistID
      }
    }, {session});
    await sharedPlaylistModel.updateOne({_id: playlistID}, {
      $pull: {
        members: {
          memberID: userID
        }
      }
    })
    await session.commitTransaction();
    res.sendStatus(200)
  } catch (error) {
    res.status(500).json(error);
    await session.abortTransaction();
  } finally {
    await session.endSession();
  }
}

module.exports = {
  createSharedPlaylist,
  addMemberToSharedPlaylist,
  removeMemberFromSharedPlaylist,
  leaveSharedPlaylist,
};
