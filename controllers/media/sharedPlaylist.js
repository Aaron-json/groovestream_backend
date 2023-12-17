const mongoose = require("mongoose");
const uuid = require("uuid")
const {
  sharedPlaylistModel,
} = require("../../db/schemas/media/sharedPlaylist");
const { userModel } = require("../../db/schemas/user/userSchema");
const { deleteSharedPlaylistAudioFileHelper } = require("./sharedPlaylistAudioFile");
const { userSocialsModel } = require("../../db/schemas/social/userSocials");

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
        _removeSharedPlaylistFromMemberDoc(playlistID, member._id, session)
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
    res.status(500).json(e);
  }
  finally {
    session && await session.endSession();
  }
}

async function isOwner(userID, playlistID) {
  const playlist = await sharedPlaylistModel.findById(playlistID, {
    owner: 1
  });
  console.log(playlist, userID)
  return playlist?.owner === userID;
}

async function sendPlaylistInvite(req, res) {
  const { userID } = req;
  const { playlistID } = req.params;
  const { memberEmail } = req.body;
  let session;
  try {
    session = await mongoose.startSession()
    session.startTransaction()
    // find the recipients ID
    const recipient = await userModel.findOne({ email: memberEmail }, {
      NOT_A_REAL_FIELD: 1 // makes it an inclusion projection since id is included by default
    }); // we need to get the user's id and add to their invitations collection
    if (!recipient) {
      throw new Error({ code: 404, message: "User does not exist" });
    }
    if (recipient._id === userID) {
      throw new Error({ code: 400, message: "Cannot invite yourself to playlist" })
    }
    const recipientSocials = await userSocialsModel.findOneAndUpdate({
      userID: recipient._id,
    }, {
      $push: {
        playlistInvites: {
          $each: [{ playlistID, senderID: userID }],
          $slice: -10
        }
      }
      // slice requires us to use each when adding
    }, {
      projection: {
        _id: 0,
        playlistInvites: {
          $elemMatch: {
            playlistID
          }
        },
      },
      runValidators: true, // mongoose does not run validation on update methods by default
      session,
      new: false // return the old version before attempting to add document
    });

    if (!recipientSocials) {
      throw new Error({ code: 404, message: "User does not exist" });
    }

    if (recipientSocials.playlistInvites.length !== 0) {
      // if invite already existed before adding, abort the operation
      // session terminates all changes if any error occurs
      throw new Error({ code: 400, message: "Invite already sent" })
    }
    await session.commitTransaction()
    res.json(200);
  } catch (err) {
    session && await session.abortTransaction()
    res.status(500).json(err);
  } finally {
    session && await session.endSession()
  }
}

async function acceptPlaylistInvite(req, res) {
  // TODO
  const { userID } = req;
  const { senderID, playlistID } = req.params;
  let session;
  try {
    session = await mongoose.startSession()
    session.startTransaction()
    // check if invite exists exists
    const socialsDoc = await userSocialsModel.findOneAndUpdate({ userID }, {
      $pull: {
        playlistInvites: {
          playlistID
        }
      }
    }, {
      projection: {
        playlistInvites: {
          $elemMatch: {
            playlistID
          }
        }
      },
      runValidators: true,
      session,
      new: false, // returns document before removing the invite. use this to check if invite was there in the first place
    });
    if (!socialsDoc) {
      throw new Error({ code: 404, message: "User does not exist" })
    }
    if (socialsDoc.playlistInvites.length === 0) {
      throw new Error({ code: 404, message: "Invite not found" });
    }
    await userModel.updateOne({ _id: userID }, {
      $push: {
        sharedPlaylists: socialsDoc.playlistInvites[0].playlistID
      }
    }, {
      session,
    })
    await session.commitTransaction();
    res.json(200)
  } catch (err) {
    console.log(err)
    session && await session.abortTransaction();
    res.status(500).json(err)
  } finally {
    session && await session.endSession();
  }
}

async function rejectPlaylistInvite(req, res) {
  const { userID } = req;
  const { senderID, playlistID } = req.params;
  let session;
  try {
    console.log("rejecting")
    session = await mongoose.startSession()
    session.startTransaction()
    const query = await userSocialsModel.findOneAndUpdate({
      userID,
    }, {
      $pull: {
        playlistInvites: {
          playlistID
        }
      }
    }, {
      projection: {
        playlistInvites: {
          $elemMatch: {
            playlistID: playlistID,
          }
        }
      },
      session,
      new: false,
    })
    if (!query) {
      throw new Error({ code: 404, message: "User not found." })
    }
    if (query.playlistInvites.length === 0) {
      throw new Error({ code: 404, message: "Invite does not exists" })
    }
    await session.commitTransaction()
    res.sendStatus(200)
  } catch (err) {
    console.log(err)
    session && await session.abortTransaction()
    res.status(500).json(err)
  } finally {
    session && await session.endSession()
  }
}
async function getSharedPlaylistsInvites(req, res) {
  const { userID } = req;
  const { limit, skip } = req.query;

  try {
    const playlistInvitesQuery = await userSocialsModel
      .findOne(
        { userID },
        {
          playlistInvites: { $slice: [0, 10] },
          // DUMMY inclusion field to exclude all other fields except friends array
          // slice is treated as an exclusion field so other fields would still
          // be included
          _id: 0,
          _NOT_A_REAL_FIELD: 1,
        }
      )
      .populate("playlistInvites.senderID", {
        email: 1,
        _id: 1,
      })
      .populate("playlistInvites.playlistID", {
        _id: 1,
        name: 1,
      })
    res.send(playlistInvitesQuery.playlistInvites);
  } catch (e) {
    console.log(e);
    res.sendStatus(500);
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
      return res.status(403).json({ code: 403, message: "Unauthorized. You are not the owner of this playlist" })
    }
    await Promise.all([
      _removeSharedPlaylistFromMemberDoc(playlistID, memberID, session),
      _removeMemberFromSharedPlaylist(playlistID, memberID, session)
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
async function _removeSharedPlaylistFromMemberDoc(playlistID, memberID, session) {
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
async function _removeMemberFromSharedPlaylist(playlistID, memberID, session) {
  return sharedPlaylistModel.updateOne(
    { _id: playlistID },
    {
      $pull: {
        members: {
          memberID
        }
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
      _removeSharedPlaylistFromMemberDoc(playlistID, userID, session),
      _removeMemberFromSharedPlaylist(playlistID, userID, session),
    ])
    await session.commitTransaction();
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
    session && await session.abortTransaction();
  } finally {
    session && await session.endSession();
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
      .populate("sharedPlaylists.members", {
        firstName: 1,
        lastName: 1,
        email: 1,
        _id: 1,
      })
    res.json(sharedPlaylistQuery.sharedPlaylists[0])
  } catch (error) {
    console.log(error)
    res.status(500).json(error)
  }
}

module.exports = {
  createSharedPlaylist,
  deleteSharedPlaylist,
  sendPlaylistInvite,
  acceptPlaylistInvite,
  rejectPlaylistInvite,
  getSharedPlaylistsInvites,
  removeMember,
  leaveSharedPlaylist,
  getSharedPlaylistInfo,
};
