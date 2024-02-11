import mongoose from "mongoose";
import { userModel } from "../../db/schemas/user/userSchema.js";
import { getProfilePicture } from "../user/userController.js";
import { userSocialsModel } from "../../db/schemas/social/userSocials.js";
import { Request, Response } from "express";
import { AuthRequest } from "../auth/middleware.js";

const friendFieldsProjection = {
  firstName: 1,
  lastName: 1,
  _id: 0,
};

export async function getFriends(
  userID: string,
  limit?: number,
  skip?: number
) {
  let projection;
  if (limit && skip) {
    projection = {
      friends: {
        $slice: [limit, skip],
      },
      // DUMMY inclusion field to exclude all other fields except friends array
      // slice is treated as an exclusion field so other fields would still
      // be included
      _id: 0,
      _NOT_A_REAL_FIELD: 1,
    };
  } else {
    projection = {
      friends: 1,
    };
  }

  const friendsQuery = await userSocialsModel
    .findOne({ userID }, projection)
    .populate("friends.friendID", {
      firstName: 1,
      lastName: 1,
      email: 1,
      _id: 1,
    });
  if (!friendsQuery) {
    throw new Error("Could not find user");
  }
  return friendsQuery.friends;
}

export async function getFriendRequests(userID: string) {
  const friendRequestsQuery = await userSocialsModel
    .findOne(
      { userID },
      {
        friendRequests: 1,
        _id: 0,
      }
    )
    .populate("friendRequests.senderID", {
      email: 1,
      _id: 1,
    });
  if (!friendRequestsQuery) {
    throw new Error("Could not find user");
  }
  return friendRequestsQuery.friendRequests;
}

export async function getFriendProfilePicture(req: Request, res: Response) {
  const { userID } = req as AuthRequest;
  const { friendID } = req.params;
  try {
    const isValidFriend = await friendExists(userID, friendID);
    if (!isValidFriend) {
      return res.sendStatus(400);
    }
    const friendProfilePicture = await getProfilePicture(friendID);
    res.json(friendProfilePicture);
  } catch (e) {
    res.status(500).json(e);
  }
}

export async function friendExists(userID: string, friendID: string) {
  const friendQuery = await userSocialsModel
    .findOne(
      {
        userID,
        "friends.friendID": friendID,
      },
      { "friends.$": 1 }
    )
    .lean();
  return !!friendQuery;
}

export async function friendRequestExists(
  userID: string,
  requestSenderID: string
) {
  // not necessary since we can just try to delete the friend request
  // if delete is successful then it did exist
  // that means we do not need two queries but one
  const friendQuery = await userSocialsModel
    .find(
      {
        userID,
        "friendRequests.senderID": requestSenderID,
      },
      { "friendRequests.$": 1 }
    )
    .lean();

  return friendQuery[0].friendRequests.length !== 0;
}

export async function deleteFriendRequest(
  userID: string,
  requestSenderID: string,
  session?: mongoose.mongo.ClientSession
) {
  return userSocialsModel.updateOne(
    { userID },
    {
      $pull: {
        friendRequests: {
          senderID: requestSenderID,
        },
      },
    },
    {
      session,
    }
  );
}

export async function sendFriendRequest(req: Request, res: Response) {
  const { userID } = req as AuthRequest;
  const { requestReceiverEmail } = req.body;

  try {
    const receiverIDQuery = await userModel
      .find({ email: requestReceiverEmail }, { _id: 1 })
      .lean();
    const receiverID = receiverIDQuery[0]._id;
    if (receiverID === userID) {
      throw new Error("Cannot send a friend request to yourself");
    } else if (await friendExists(userID, receiverID)) {
      throw new Error("Friend already exists");
    }
    await deleteFriendRequest(receiverID, userID);
    const addFriendRequestQuery = await userSocialsModel.updateOne(
      { userID: receiverID },
      {
        $push: {
          friendRequests: {
            $each: [{ senderID: userID }],
            //limit requests to only 20 of the most recent ones
            $slice: -20,
          },
        },
      }
    );
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(500);
  }
}

export async function acceptFriendRequest(req: Request, res: Response) {
  const { userID } = req as AuthRequest;
  const { requestSenderID } = req.params;
  let session;
  try {
    session = await mongoose.startSession();
    // check that the modified count is 0. Check shape of the object
    session.startTransaction();
    const deleteFriendRequestReponse = await deleteFriendRequest(
      userID,
      requestSenderID,
      session
    );

    await Promise.all([
      _addFriend(userID, requestSenderID, session),
      _addFriend(requestSenderID, userID, session),
    ]);

    await session.commitTransaction();

    res.sendStatus(201);
  } catch (e) {
    await session?.abortTransaction();
    res.sendStatus(500);
  } finally {
    await session?.endSession();
  }
}

export async function rejectFriendRequest(req: Request, res: Response) {
  const { userID } = req as AuthRequest;
  const { requestSenderID } = req.params;

  try {
    await deleteFriendRequest(userID, requestSenderID);
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(500);
  }
}

async function _addFriend(
  userID: string,
  friendID: string,
  session?: mongoose.mongo.ClientSession
) {
  return userSocialsModel.updateOne(
    { userID },
    {
      $push: {
        friends: {
          friendID,
        },
      },
    },
    { session }
  );
}

export async function deleteFriend(req: Request, res: Response) {
  const { userID } = req as AuthRequest;
  const { friendID } = req.params;
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    await deleteFriendHelper(userID, friendID, session);
    await deleteFriendHelper(friendID, userID, session);
    await session.commitTransaction();
    res.sendStatus(200);
  } catch (e) {
    await session?.abortTransaction();
    res.send(e);
  } finally {
    await session?.endSession();
  }
}

async function deleteFriendHelper(
  userID: string,
  friendID: string,
  session?: mongoose.mongo.ClientSession
) {
  return userSocialsModel.updateOne(
    { userID },
    {
      $pull: {
        friends: {
          friendID,
        },
      },
    },
    {
      session,
    }
  );
}
