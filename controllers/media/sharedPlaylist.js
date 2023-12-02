const mongoose = require("mongoose");
const uuid = require("uuid")
const {
  sharedPlaylistModel,
} = require("../../db/schemas/media/sharedPlaylist");
const { userModel } = require("../../db/schemas/user/userSchema");
const { friendExists } = require("../social/friendsController");
const { deleteSharedPlaylistAudioFileHelper } = require("./sharedPlaylistAudioFile")
async function createSharedPlaylist(req, res) {
  const { userID } = req;
  const { name } = req.body;
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const newSharedPlaylist = await sharedPlaylistModel.create(
      [
        {
          _id: uuid.v4(),
          name,
          owner: userID,
        },
      ],
      { session }
    );
    // we need the id of the newly created document so we can not do it in parralel
    // we could create the id here however, we want all ids to be created as defined
    // in the schema so it it centralzed.
    await userModel.updateOne(
      { _id: userID },
      {
        $push: {
          sharedPlaylists: newSharedPlaylist[0]._id,
        },
      },
      { session }
    );

    await session.commitTransaction();
    res.status(201).json(newSharedPlaylist);

  } catch (error) {
    console.log(error);
    res.sendStatus(500);
    session && await session.abortTransaction();
  } finally {
    session && await session.endSession();
  }
}

async function deleteSharedPlaylist(req, res) {
  const { userID } = req;
  const { playlistID } = req.params;
  let session;
  try {
    if (!(await isOwner(userID, playlistID))) {
      // do not return immediately since we need to close the
      // session in the finally clause
      throw new Error({ code: 403, message: "You are not the owner of this playlist." })
    }
    session = await mongoose.startSession();// could throw error so start it in try catch
    session.startTransaction();
    const sharedPlaylist = await sharedPlaylistModel.findById(playlistID, {
      members: 1, audioFiles: 1
    })

    if (!sharedPlaylist) {
      throw new Error({ code: 404, message: `Could not find playlist with id ${playlistID}` });
    }

    const deletePromises = []
    //remove this shared playlist from all member's documents
    for (const member of sharedPlaylist.members) {

      deletePromises.push(
        removeSharedPlaylistFromMemberDoc(playlistID, member._id, session)
      );
    }
    // remove this playlist from the owner's record
    deletePromises.push(userModel.findByIdAndUpdate({
      _id: userID,
    }, {
      $pull: {
        sharedPlaylists: playlistID,
      }
    }, { session }))

    for (const audioFile of sharedPlaylist.audioFiles) {
      console.log(`audiofile ${audioFile._id} gone`);
      deletePromises.push(deleteSharedPlaylistAudioFileHelper(playlistID, audioFile._id, session));
    }

    await Promise.all(deletePromises); // wait for all audio files and members to be removed

    await sharedPlaylistModel.deleteOne({ _id: playlistID }, { session }); // delete the playlist document from collection

    await session.commitTransaction();

    res.sendStatus(200);

  } catch (e) {
    console.log(e);
    session && await session.abortTransaction();
    res.sendStatus(500).json(e);
  }
  finally {
    session && await session.endSession();
  }
}

async function isOwner(userID, playlistID) {
  const playlist = await sharedPlaylistModel.findById(playlistID, {
    owner: 1
  });
  return playlist?.owner === userID;
}

async function addMemberToSharedPlaylist(req, res) {
  const { userID } = req;
  const { playlistID } = req.params;
  const { memberEmail } = req.body;
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

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
    // if (!friendExists(userID, memberIDResponse._id)) {
    //   throw new Error("You are not friends with this user.");
    // } // you can now join playlist without being their friend
    playlist.members.push(memberIDResponse._id);
    memberIDResponse.sharedPlaylists.push(playlist._id);
    await Promise.all([
      playlist.save({ session }),
      memberIDResponse.save({ session }),
    ]);
    await session.commitTransaction();
    res.sendStatus(204);
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
    session && await session.abortTransaction();
  } finally {
    session && await session.endSession();
  }
}

async function removeMember(req, res) {
  const { userID } = req;
  const { playlistID, memberID } = req.params;
  let session;
  try {
    session = await mongoose.startSession()
    session.startTransaction();
    if (!(await isOwner(userID, playlistID))) {
      return res.status(403).json({ message: "Unauthorized. You are not the owner of this playlist" })
    }
    await Promise.all([
      removeSharedPlaylistFromMemberDoc(playlistID, memberID, session),
      removeMemberFromSharedPlaylist(playlistID, memberID, session)
    ]);

    await session.commitTransaction();
    res.send(200)
  } catch (error) {
    session && await session.abortTransaction()
    res.sendStatus(500);
  } finally {
    session && await session.endSession()
  }
}
async function removeSharedPlaylistFromMemberDoc(playlistID, memberID, session) {
  return userModel.updateOne(
    { _id: memberID },
    {
      $pull: {
        sharedPlaylists: playlistID,
      },
    },
    { session }
  );
}
async function removeMemberFromSharedPlaylist(playlistID, memberID, session) {
  return sharedPlaylistModel.updateOne(
    { _id: playlistID },
    {
      $pull: {
        members: memberID,
      },
    },
    { session }
  );
}

async function leaveSharedPlaylist(req, res) {
  const { userID } = req;
  const { playlistID } = req.params;

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    await Promise.all([
      removeSharedPlaylistFromMemberDoc(playlistID, userID, session),
      removeMemberFromSharedPlaylist(playlistID, userID, session),
    ])
    await session.commitTransaction();
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
    await session.abortTransaction();
  } finally {
    await session.endSession();
  }
}

async function getSharedPlaylistInfo(req, res) {
  const { userID } = req;
  const { playlistID } = req.params;

  try {
    const sharedPlaylistQuery = await userModel.findOne({
      _id: userID,
      "sharedPlaylists": playlistID,
    }, { "sharedPlaylists.$": 1 })
      .populate("sharedPlaylists")
    res.json(sharedPlaylistQuery.sharedPlaylists[0])
  } catch (error) {
    console.log(error)
    res.status(500).json(error)
  }
}

module.exports = {
  createSharedPlaylist,
  deleteSharedPlaylist,
  addMemberToSharedPlaylist,
  removeMember,
  leaveSharedPlaylist,
  getSharedPlaylistInfo
};
