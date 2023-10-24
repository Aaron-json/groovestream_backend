const mongoose = require("mongoose");
const {
  sharedPlaylistModel,
} = require("../../db/schemas/media/sharedPlaylist");
const { userModel } = require("../../db/schemas/user/userSchema");
const { friendExists } = require("../social/friendsController");
async function createSharedPlaylist(req, res) {
  const { userID } = req;
  const { name } = req.body;

  try {
    const newSharedPlaylist = await sharedPlaylistModel.create({
      name,
      owner: userID,
    });
    return res.status(201).json(newSharedPlaylist);
  } catch (error) {
    res.sendStatus(500);
  }
}

async function addMemberToSharedPlaylist(req, res) {
  const { userID } = req;
  const { playlistID } = req.params;
  const { memberEmail } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    //get member's id from database to add to database.
    const memberIDQuery = userModel.findOne({ email: memberEmail });
    const playlistQuery = sharedPlaylistModel.findById(playlistID);
    let [memberIDResponse, playlist] = await Promise.all([
      memberIDQuery,
      playlistQuery,
    ]);
    if (!memberIDResponse || !playlist) {
      throw new Error("User or Playlist not found");
    }
    if (!friendExists(userID, memberIDResponse._id)) {
      return res
        .status(403)
        .send({ message: "You are not friends with this user" });
    }
    playlist.members.push(memberIDResponse._id);
    memberIDResponse.sharedPlaylists.push(playlist._id);
    await Promise.all([playlist.save(), memberIDResponse.save()]);
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
  const { userID } = req;
  const { playlistID } = req.params;
  const { memberID } = req.body;
  //  TODO: Implement logic to remove member from shared playlist
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const memberIDQuery = userModel.updateOne({ _id });

    await session.commitTransaction();
  } catch {
    await session.abortTransaction();
  } finally {
    await session.endSession();
  }
}

module.exports = {
  createSharedPlaylist,
};
