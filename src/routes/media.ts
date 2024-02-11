import express from "express";
import {
  deleteAudioFile,
  getAudioFileInfo,
  uploadAudioFile,
  downloadAudioFile,
} from "../controllers/media/audioFile.js";

import {
  createPlaylist,
  deletePlaylist,
  getPlaylistInfo,
} from "../controllers/media/playlist.js";
import {
  deletePlaylistAudioFile,
  getPlaylistAudioFileInfo,
} from "../controllers/media/playlistAudioFile.js";
import { getAllUserMedia } from "../controllers/media/media.js";
import {
  AuthRequest,
  verifyAccessToken,
} from "../controllers/auth/middleware.js";
import {
  createSharedPlaylist,
  removeMember,
  leaveSharedPlaylist,
  getSharedPlaylistInfo,
  deleteSharedPlaylist,
  sendPlaylistInvite,
  acceptPlaylistInvite,
  rejectPlaylistInvite,
  getSharedPlaylistsInvites,
} from "../controllers/media/sharedPlaylist.js";
import { deleteSharedPlaylistAudioFile } from "../controllers/media/sharedPlaylistAudioFile.js";
//const multer = require('multer')
//const upload = multer() // uncomment when not using streaming functionality
const router = express.Router();

router.use(verifyAccessToken);

//endpoints specifically for handling all types of audioFile
// uplaod and downloads. their controllers directly interact with res and req
// objects so they receive them directly
router.post("/audioFile/:mediaType/", uploadAudioFile);
router.post("/audioFile/:mediaType/:playlistID", uploadAudioFile);
router.get("/audiofile/:mediaType/:audioFileID", downloadAudioFile);
router.get("/audiofile/:mediaType/:audioFileID/:playlistID", downloadAudioFile);
//get all user media
router.route("/").get(async (req, res) => {
  try {
    const media = await getAllUserMedia((req as AuthRequest).userID);
    res.json(media);
  } catch (err) {
    res.status(500).send(err);
  }
});
// audioFile routes
// get audiofile metadata
router.get("/info/0/:audioFileID", async (req, res) => {
  const { userID } = req as unknown as AuthRequest;
  const { audioFileID } = req.params;
  try {
    const metadata = await getAudioFileInfo(userID, audioFileID);
    res.send(metadata);
  } catch (error) {
    res.status(500).send(error);
  }
});

// delete an audiofile
router.delete("/0/:audioFileID", async (req, res) => {
  try {
    await deleteAudioFile(
      (req as unknown as AuthRequest).userID,
      req.params.audioFileID
    );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});

// playlist routes
// create playlist
router.post("/1", async (req, res) => {
  try {
    await createPlaylist((req as AuthRequest).userID, req.body.name);
    res.sendStatus(201);
  } catch (error) {
    res.status(500).send(error);
  }
});

// get the playlist's metadata document
router.get("/1/:playlistID", async (req, res) => {
  try {
    const playlist = await getPlaylistInfo(
      (req as unknown as AuthRequest).userID,
      req.params.playlistID
    );
    res.send(playlist);
  } catch (error) {
    res.status(500).send(error);
  }
});
// delete playlist
router.delete("/1/:playlistID", async (req, res) => {
  try {
    await deletePlaylist(
      (req as unknown as AuthRequest).userID,
      req.params.playlistID
    );
  } catch (error) {
    res.status(500).send(error);
  }
});
//playlist audio file routes
// get playlist audio file metadata
router.get("/info/2/:playlistID/:audioFileID", async (req, res) => {
  try {
    const info = await getPlaylistAudioFileInfo(
      (req as unknown as AuthRequest).userID,
      req.params.audioFileID,
      req.params.playlistID
    );
    res.send(info);
  } catch (error) {
    res.status(500).json(error);
  }
});
// delete playlist audiofile
router.delete("/2/:audioFileID/:playlistID", async (req, res) => {
  try {
    await deletePlaylistAudioFile(
      (req as unknown as AuthRequest).userID,
      req.params.audioFileID,
      req.params.playlistID
    );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});

//shared playlists routes
// create new shared playlist
router.post("/3", async (req, res) => {
  try {
    await createSharedPlaylist((req as AuthRequest).userID, req.body.name);
    res.sendStatus(201);
  } catch (error) {
    res.status(500).send(error);
  }
});
// delete shared playlist
router.delete("/3/:playlistID", async (req, res) => {
  try {
    await deleteSharedPlaylist(
      (req as unknown as AuthRequest).userID,
      req.params.playlistID
    );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});
// get user's playlist invites
router.get("/3/invites", async (req, res) => {
  try {
    const invites = await getSharedPlaylistsInvites(
      (req as AuthRequest).userID
    );
    res.json(invites);
  } catch (error) {
    res.status(500).send(error);
  }
});
// invite a user to a playlist
router.post("/3/invite/:playlistID", async (req: any, res) => {
  try {
    await sendPlaylistInvite(
      (req as AuthRequest).userID,
      req.params.playlistID,
      req.body.memberEmail
    );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});
// accept an invite to a playlist
router.post("/3/member/:senderID/:playlistID", async (req, res) => {
  try {
    await acceptPlaylistInvite(
      (req as unknown as AuthRequest).userID,
      req.params.playlistID,
      req.params.senderID
    );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});
// reject / delete a user's invite
router.delete("/3/invite/:senderID/:playlistID", async (req, res) => {
  try {
    await rejectPlaylistInvite(
      (req as unknown as AuthRequest).userID,
      req.params.playlistID,
      req.params.senderID
    );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});
// remove member from shared playlist
router.delete("/3/member/:playlistID/:memberID", async (req, res) => {
  try {
    await removeMember(
      (req as unknown as AuthRequest).userID,
      req.params.playlistID,
      req.params.memberID
    );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});
// get shared playlist info
router.get("/3/:playlistID", async (req, res) => {
  try {
    const info = await getSharedPlaylistInfo(
      (req as unknown as AuthRequest).userID,
      req.params.playlistID
    );
    res.send(info);
  } catch (error) {
    res.status(500).send(error);
  }
});
// router.get("/info/4/:playlistID/:audioFileID", getSharedPlaylistAudioFileInfo)
// leave a shared playlist
router.delete("/3/member/:playlistID", async (req, res) => {
  try {
    await leaveSharedPlaylist(
      (req as unknown as AuthRequest).userID,
      req.params.playlistID
    );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});

//shared playlist audiofile routes
router.delete("/4/:audioFileID/:playlistID", async (req, res) => {
  try {
    await deleteSharedPlaylistAudioFile(
      (req as unknown as AuthRequest).userID,
      req.params.audioFileID,
      req.params.playlistID
    );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error);
  }
});
// get info about any media (deprecated) use media type specific info requests
// router.get("/info/:mediaType/:mediaID", getMediaInfo);

export default router;
