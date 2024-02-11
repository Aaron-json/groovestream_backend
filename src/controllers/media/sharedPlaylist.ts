import mongoose from "mongoose";
import * as uuid from "uuid";
import { sharedPlaylistModel } from "../../db/schemas/media/sharedPlaylist.js";
import { userModel } from "../../db/schemas/user/userSchema.js";
import { deleteSharedPlaylistAudioFileHelper } from "./sharedPlaylistAudioFile.js";
import { userSocialsModel } from "../../db/schemas/social/userSocials.js";

export async function createSharedPlaylist(userID: string, name: string) {
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
  } catch (error) {
    session && (await session.abortTransaction());
    throw error;
  } finally {
    session && (await session.endSession());
  }
}

export async function deleteSharedPlaylist(userID: string, playlistID: string) {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const sharedPlaylist = await sharedPlaylistModel.findById(playlistID, {
      members: 1,
      audioFiles: 1,
      owner: 1,
    });

    if (!sharedPlaylist) {
      throw new Error(`Could not find playlist with id ${playlistID}`);
    }

    if (sharedPlaylist.owner !== userID) {
      throw new Error("You are not the owner of this playlist.");
    }
    const deletePromises = [];
    //remove this shared playlist from all member's documents
    for (const member of sharedPlaylist.members) {
      deletePromises.push(
        _removeSharedPlaylistFromMemberDoc(
          playlistID,
          member._id?.toString()!,
          session
        )
      );
    }
    // remove this playlist from the owner's record
    deletePromises.push(
      userModel.findByIdAndUpdate(
        {
          _id: userID,
        },
        {
          $pull: {
            sharedPlaylists: playlistID,
          },
        },
        { session }
      )
    );

    for (const audioFile of sharedPlaylist.audioFiles) {
      // delete the audio files from storage
      deletePromises.push(
        deleteSharedPlaylistAudioFileHelper(
          playlistID,
          audioFile._id?.toString()!,
          session
        )
      );
    }

    await Promise.all(deletePromises); // wait for all audio files and members to be removed

    await sharedPlaylistModel.deleteOne({ _id: playlistID }, { session }); // delete the playlist document from collection

    await session.commitTransaction();
  } catch (e) {
    // catch exceptions to gracefully terminate the session
    // rethrow to bubble them up to the caller
    session && (await session.abortTransaction());
    throw e;
  } finally {
    session && (await session.endSession());
  }
}

export async function isOwner(userID: string, playlistID: string) {
  const playlist = await sharedPlaylistModel.findById(playlistID, {
    owner: 1,
    _id: 1,
  });
  return playlist?.owner === userID;
}

export async function sendPlaylistInvite(
  userID: string,
  playlistID: string,
  memberEmail: string
) {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    // find the recipients ID
    const recipient = await userModel.findOne(
      { email: memberEmail },
      {
        NOT_A_REAL_FIELD: 1, // makes it an inclusion projection since id is included by default
      }
    ); // we need to get the user's id and add to their invitations collection
    if (!recipient) {
      throw new Error("User does not exist");
    }
    if (recipient._id === userID) {
      throw new Error("Cannot invite yourself to playlist");
    }
    // add a new invite object and return the old version before the update
    const recipientSocials = await userSocialsModel.findOneAndUpdate(
      {
        userID: recipient._id,
      },
      {
        $push: {
          playlistInvites: {
            $each: [{ playlistID, senderID: userID }],
            // slice requires us to use each operator when adding
            $slice: -10,
            // only keep the 10 most recent invites.
          },
        },
      },
      {
        projection: {
          _id: 0,
          playlistInvites: {
            // use this peojection to verify if an innvite to this playlist already existed before
            $elemMatch: {
              playlistID,
            },
          },
        },
        runValidators: true, // mongoose does not run validation on update methods by default
        session,
        new: false, // return the old version before attempting to add document
      }
    );

    if (!recipientSocials) {
      throw new Error("User does not exist");
    }
    if (recipientSocials.playlistInvites.length !== 0) {
      // if invite already existed before adding, abort the operation
      // session terminates all changes if any error occurs
      throw new Error("Invite already sent");
    }
    await session.commitTransaction();
  } catch (err) {
    session && (await session.abortTransaction());
    throw err;
  } finally {
    session && (await session.endSession());
  }
}

export async function acceptPlaylistInvite(
  userID: string,
  playlistID: string,
  senderID: string
) {
  // TODO
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    // check if invite exists exists
    const socialsDoc = await userSocialsModel.findOneAndUpdate(
      { userID },
      {
        $pull: {
          playlistInvites: {
            playlistID,
          },
        },
      },
      {
        projection: {
          playlistInvites: {
            $elemMatch: {
              playlistID,
            },
          },
        },
        runValidators: true,
        session,
        new: false, // returns document before removing the invite. use this to check if invite was there in the first place
      }
    );
    if (!socialsDoc) {
      throw new Error("User does not exist");
    }
    if (socialsDoc.playlistInvites.length === 0) {
      throw new Error("Invite not found");
    }
    await userModel.updateOne(
      { _id: userID },
      {
        $push: {
          sharedPlaylists: socialsDoc.playlistInvites[0].playlistID,
        },
      },
      {
        session,
      }
    );
    await session.commitTransaction();
  } catch (err) {
    session && (await session.abortTransaction());
    throw err;
  } finally {
    session && (await session.endSession());
  }
}

export async function rejectPlaylistInvite(
  userID: string,
  playlistID: string,
  senderID: string
) {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const query = await userSocialsModel.findOneAndUpdate(
      {
        userID,
      },
      {
        $pull: {
          playlistInvites: {
            playlistID,
          },
        },
      },
      {
        projection: {
          playlistInvites: {
            $elemMatch: {
              playlistID: playlistID,
            },
          },
        },
        session,
        new: false,
      }
    );
    if (!query) {
      throw new Error("User not found.");
    }
    if (query.playlistInvites.length === 0) {
      throw new Error("Invite does not exists");
    }
    await session.commitTransaction();
  } catch (err) {
    session && (await session.abortTransaction());
    throw err;
  } finally {
    session && (await session.endSession());
  }
}
export async function getSharedPlaylistsInvites(userID: string) {
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
    });
  if (!playlistInvitesQuery) {
    throw new Error("Could not find user");
  }
  return playlistInvitesQuery.playlistInvites;
}
export async function removeMember(
  userID: string,
  playlistID: string,
  memberID: string
) {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    if (!(await isOwner(userID, playlistID))) {
      throw new Error("Unauthorized. You are not the owner of this playlist");
    }
    await Promise.all([
      _removeSharedPlaylistFromMemberDoc(playlistID, memberID, session),
      _removeMemberFromSharedPlaylist(playlistID, memberID, session),
    ]);

    await session.commitTransaction();
  } catch (error) {
    session && (await session.abortTransaction());
    throw error;
  } finally {
    session && (await session.endSession());
  }
}
export async function _removeSharedPlaylistFromMemberDoc(
  playlistID: string,
  memberID: string,
  session: mongoose.mongo.ClientSession
) {
  const reponse = await userModel.updateOne(
    { _id: memberID },
    {
      $pull: {
        sharedPlaylists: playlistID,
      },
    },
    { session }
  );
  if (reponse.modifiedCount === 0) {
    throw new Error("Could not remove shared playlist from member's document");
  }
}
async function _removeMemberFromSharedPlaylist(
  playlistID: string,
  memberID: string,
  session: mongoose.mongo.ClientSession
) {
  const response = await sharedPlaylistModel.updateOne(
    { _id: playlistID },
    {
      $pull: {
        members: {
          memberID,
        },
      },
    },
    { session }
  );
  if (response.modifiedCount === 0) {
    throw new Error("Couldn't remove member from playlist's document");
  }
}

export async function leaveSharedPlaylist(userID: string, playlistID: string) {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    await Promise.all([
      _removeSharedPlaylistFromMemberDoc(playlistID, userID, session),
      _removeMemberFromSharedPlaylist(playlistID, userID, session),
    ]);
    await session.commitTransaction();
  } catch (error) {
    session && (await session.abortTransaction());
    throw error;
  } finally {
    session && (await session.endSession());
  }
}

export async function getSharedPlaylistInfo(
  userID: string,
  playlistID: string
) {
  const query = await userModel
    .findOne(
      {
        _id: userID,
        sharedPlaylists: playlistID,
      },
      { "sharedPlaylists.$": 1 }
    )
    .populate("sharedPlaylists")
    .populate("sharedPlaylists.members", {
      firstName: 1,
      lastName: 1,
      email: 1,
      _id: 1,
    });
  if (!query) {
    throw new Error("User or playlist not found");
  }
  return query.sharedPlaylists[0];
}
