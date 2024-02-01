const mongoose = require("mongoose");
const { userModel } = require("../../db/schemas/user/userSchema");
const { getProfilePicture } = require("../user/userController");
const { userSocialsModel } = require("../../db/schemas/social/userSocials");
const friendFieldsProjection = {
  firstName: 1,
  lastName: 1,
  _id: 0,
};

async function getFriends(req, res) {
  const { userID } = req;
  const { limit, skip } = req.query;
  try {
    const friendsQuery = await userSocialsModel
      .findOne(
        { userID },
        {
          friends: { $slice: [Number(skip), Number(limit)] },
          // DUMMY inclusion field to exclude all other fields except friends array
          // slice is treated as an exclusion field so other fields would still
          // be included
          _id: 0,
          _NOT_A_REAL_FIELD: 1,
        }
      )
      .populate("friends.friendID", {
        firstName: 1,
        lastName: 1,
        email: 1,
        _id: 1,
      });

    res.send(friendsQuery.friends);
  } catch (e) {
    res.sendStatus(500);
  }
}

async function getFriendRequests(req, res) {
  const { userID } = req;

  try {
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
    res.send(friendRequestsQuery.friendRequests);
  } catch (e) {
    res.sendStatus(500);
  }
}

async function getFriendProfilePicture(req, res) {
  const { userID } = req;
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

async function friendExists(userID, friendID) {
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

async function friendRequestExists(userID, requestSenderID) {
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

async function deleteFriendRequest(
  userID,
  requestSenderID,
  session = undefined
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

async function sendFriendRequest(req, res) {
  const { userID } = req;
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
            $slice: -20
          },
        },
      }
    );
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(500);
  }
}

async function acceptFriendRequest(req, res) {
  const { userID } = req;
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
    session && await session.abortTransaction();
    res.sendStatus(500);
  } finally {
    session && await session.endSession();
  }
}

async function rejectFriendRequest(req, res) {
  const { userID } = req;
  const { requestSenderID } = req.params;

  try {
    await deleteFriendRequest(userID, requestSenderID);
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(500);
  }
}

async function _addFriend(userID, friendID, session = undefined) {
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

async function deleteFriend(req, res) {
  const { userID } = req;
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
    await session.abortTransaction();
    res.send(e);
  } finally {
    await session.endSession();
  }
}

async function deleteFriendHelper(userID, friendID, session = undefined) {
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

module.exports = {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendProfilePicture,
  deleteFriend,
};
