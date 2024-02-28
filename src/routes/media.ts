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
  getPlaylistAudioFiles,
  getPlaylistInfo,
} from "../controllers/media/playlist.js";
import {
  getAllUserMedia,
  listeningHistory,
  mostPlayedAudioFiles,
} from "../controllers/media/media.js";
import {
  AuthRequest,
  verifyAccessToken,
} from "../controllers/auth/middleware.js";
import {
  removeMember,
  leaveSharedPlaylist,
  sendPlaylistInvite,
  acceptPlaylistInvite,
  rejectPlaylistInvite,
  getPlaylistInvites,
} from "../controllers/media/sharedPlaylist.js";
import { MediaType } from "../types/media.js";

const router = express.Router();

router.use(verifyAccessToken);

//get all root user media
router.get("/", async (req, res) => {
  try {
    const media = await getAllUserMedia((req as AuthRequest).userID);
    res.json(media);
  } catch (err) {
    res.status(500).send(err);
  }
});
// audioFile routes

//upload audiofiles
router.post("/0", async (req, res) => {
  uploadAudioFile(req, res, MediaType.AudioFile);
});
router.post("/2/:playlistID", async (req, res) => {
  uploadAudioFile(req, res, MediaType.PlaylistAudioFile);
});
router.post("/4/:playlistID", async (req, res) => {
  uploadAudioFile(req, res, MediaType.SharedPlaylistAudioFile);
});

// get audiofile metadata
router.get(
  ["/info/0/:audioFileID", "/info/2/:audioFileID", "/info/4/:audioFileID"],
  async (req, res) => {
    const userID = (req as unknown as AuthRequest).userID;
    const audioFileID = req.params.audioFileID;
    try {
      const metadata = await getAudioFileInfo(+audioFileID);
      res.send(metadata);
    } catch (error) {
      res.status(500).send(error);
    }
  }
);

// stream an audiofile
router.get("/stream/:storageID", downloadAudioFile);
// delete an audiofile
router.delete(
  [
    "/0/:audioFileID/:storageID",
    "/2/:audioFileID/:storageID",
    "/4/:audioFileID/:storageID",
  ],
  async (req, res) => {
    try {
      await deleteAudioFile(+req.params.audioFileID, req.params.storageID);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).send(error);
    }
  }
);

// playlist routes
// create playlist
router.post("/1", async (req, res) => {
  try {
    await createPlaylist(
      (req as AuthRequest).userID,
      req.body.name,
      MediaType.Playlist
    );
    res.sendStatus(201);
  } catch (error) {
    res.status(500).send(error);
  }
});
router.post("/3", async (req, res) => {
  try {
    await createPlaylist(
      (req as AuthRequest).userID,
      req.body.name,
      MediaType.SharedPlaylist
    );
    res.sendStatus(201);
  } catch (error) {
    res.status(500).send(error);
  }
});

// get the playlist's metadata document
router.get(["info/1/:playlistID", "info/3/:playlistID"], async (req, res) => {
  try {
    const playlist = await getPlaylistInfo(+req.params.playlistID);
    res.json(playlist);
  } catch (error) {
    res.status(500).send(error);
  }
});

// get playlist audiofiles
router.get(["/1/:playlistID", "/3/:playlistID"], async (req, res) => {
  try {
    const response = await getPlaylistAudioFiles(+req.params.playlistID);
    res.json(response);
  } catch (error) {
    res.status(500).json(error);
  }
});
// delete playlist
router.delete(["/1/:playlistID", "/3/:playlistID"], async (req, res) => {
  try {
    await deletePlaylist(
      (req as unknown as AuthRequest).userID,
      req.params.playlistID
    );
  } catch (error) {
    res.status(500).send(error);
  }
});

//shared playlists routes

router.get("/audiofile/most-played", async (req, res) => {
  try {
    const results = await mostPlayedAudioFiles((req as AuthRequest).userID);
    res.json(results);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
});
router.get("/audiofile/history", async (req, res) => {
  try {
    const results = await listeningHistory((req as AuthRequest).userID);
    res.json(results);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
});
export default router;
