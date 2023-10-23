const express = require("express");
const userSocialsRouter = express.Router();
const {
  getFriendInfo,
  deleteFriend,
  sendFriendRequest,
  rejectFriendRequest, acceptFriendRequest, getFriends, getFriendRequests, getFriendProfilePicture
} = require("../controllers/social/friendsController");
const {verifyAccessToken} = require("../controllers/auth/userAuthentication");
// verify access tokens for all requests in this route
userSocialsRouter.use(verifyAccessToken);

// friend-request routes
userSocialsRouter.get("/friend-requests", getFriendRequests)
userSocialsRouter.post("/friend-request", sendFriendRequest);
userSocialsRouter.delete("/friend-request/:requestSenderID", rejectFriendRequest);

//friend routes
userSocialsRouter.get("/friends", getFriends)
userSocialsRouter.get("/friend/profilePicture/:friendID", getFriendProfilePicture)
userSocialsRouter.post("/friend/:requestSenderID", acceptFriendRequest);
userSocialsRouter.route("/friend/:friendID")
  .delete(deleteFriend)

module.exports = userSocialsRouter;