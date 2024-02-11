import express from "express";
const userSocialsRouter = express.Router();
import {
  deleteFriend,
  sendFriendRequest,
  rejectFriendRequest,
  acceptFriendRequest,
  getFriends,
  getFriendRequests,
  getFriendProfilePicture,
} from "../controllers/social/friendsController.js";
import {
  AuthRequest,
  verifyAccessToken,
} from "../controllers/auth/middleware.js";
// verify access tokens for all requests in this route
userSocialsRouter.use(verifyAccessToken);

// friend-request routes
userSocialsRouter.get("/friend-requests", async function (req, res) {
  try {
    const friendRequests = await getFriendRequests((req as AuthRequest).userID);
    res.json(friendRequests);
  } catch (error) {
    res.status(500).send(error);
  }
});
userSocialsRouter.post("/friend-request", sendFriendRequest);
userSocialsRouter.delete(
  "/friend-request/:requestSenderID",
  rejectFriendRequest
);

//friend routes
userSocialsRouter.get("/friends", async (req, res) => {
  try {
    const friends = await getFriends(
      (req as AuthRequest).userID,
      Number(req.query.limit),
      Number(req.query.skip)
    );
    res.json(friends);
  } catch (error) {
    res.status(500).send(error);
  }
});
userSocialsRouter.get(
  "/friend/profilePicture/:friendID",
  getFriendProfilePicture
);
userSocialsRouter.post("/friend/:requestSenderID", acceptFriendRequest);
userSocialsRouter.route("/friend/:friendID").delete(deleteFriend);

export default userSocialsRouter;
