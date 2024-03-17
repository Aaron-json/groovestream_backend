import express from "express";
const router = express.Router();
import {
  deleteFriend,
  sendFriendRequest,
  deleteFriendRequest,
  acceptFriendRequest,
  getFriends,
  getFriendRequests,
} from "../controllers/social/friends.js";
import {
  AuthRequest,
  verifyAccessToken,
} from "../controllers/auth/middleware.js";
import {
  getPlaylistInvites,
  sendPlaylistInvite,
  acceptPlaylistInvite,
  rejectPlaylistInvite,
  removeMember,
  leavePlaylist,
} from "../controllers/media/sharedPlaylist.js";
// verify access tokens for all requests in this route
router.use(verifyAccessToken);

// friend-request routes
router.get("/friend-requests", async function (req, res) {
  try {
    const friendRequests = await getFriendRequests((req as AuthRequest).userID);
    res.json(friendRequests);
  } catch (error) {
    res.status(500).send(error);
  }
});
router.post("/friend-request", async (req, res) => {
  try {
    await sendFriendRequest((req as AuthRequest).userID, req.body.username);
    res.sendStatus(200);
  } catch (error) {
    res.status(500).json(error);
  }
});
router.delete("/friend-request/:requestID", async (req, res) => {
  try {
    // TODO
    await deleteFriendRequest(+req.params.requestID);
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});

//friend routes
router.get("/friends", async (req, res) => {
  try {
    const friends = await getFriends(
      (req as AuthRequest).userID,
      req.query.limit ? undefined : Number(req.query.limit),
      req.query.skip ? undefined : Number(req.query.skip)
    );
    res.json(friends);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.post("/friend/:requestID/:senderID", async (req, res) => {
  try {
    await acceptFriendRequest(
      (req as unknown as AuthRequest).userID,
      +req.params.requestID,
      +req.params.senderID
    );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});
router.route("/friend/:friendshipID").delete(async (req, res) => {
  try {
    await deleteFriend(+req.params.friendshipID);
    res.sendStatus(200);
  } catch (error) {
    res.status(500).json(error);
  }
});

// get user's playlist invites
router.get("/playlist-invites", async (req, res) => {
  try {
    const invites = await getPlaylistInvites((req as AuthRequest).userID);
    res.json(invites);
  } catch (error) {
    res.status(500).send(error);
  }
});
// invite a user to a playlist
router.post("/playlist-invite/:playlistID", async (req: any, res) => {
  try {
    await sendPlaylistInvite(
      (req as AuthRequest).userID,
      req.body.username,
      +req.params.playlistID
    );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});
// accept an invite to a playlist
router.post("/playlist-member/:inviteID/:playlistID", async (req, res) => {
  try {
    await acceptPlaylistInvite(
      (req as unknown as AuthRequest).userID,
      +req.params.inviteID,
      +req.params.playlistID
    );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});
// reject a playlist invitation
router.delete("/playlist-invite/:inviteID/:playlistID", async (req, res) => {
  try {
    await rejectPlaylistInvite(+req.params.inviteID);
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});
// remove member from shared playlist
router.delete("/playlist-member/:playlistID/:memberID", async (req, res) => {
  try {
    await removeMember(
      (req as unknown as AuthRequest).userID,
      +req.params.playlistID,
      +req.params.memberID
    );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});

// leave a shared playlist
router.delete("/playlist-member/:playlistID", async (req, res) => {
  try {
    await leavePlaylist(
      (req as unknown as AuthRequest).userID,
      Number(req.params.playlistID)
    );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});
export default router;
