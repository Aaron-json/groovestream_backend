import express from "express";
import {
  deleteAudioFile,
  getAudioFileInfo,
  uploadAudioFile,
} from "../controllers/media/audioFile.js";
import {
  createPlaylist,
  deletePlaylist,
  getPlaylistAudioFiles,
  getPlaylistInfo,
} from "../controllers/media/playlist.js";
import {
  addListeningHistory,
  getListeningHistory,
  mostPlayedAudioFiles,
} from "../controllers/media/media.js";
import { getAllUserPlaylists } from "../controllers/media/playlist.js";
import {
  AuthRequest,
  verifyAccessToken,
} from "../controllers/auth/middleware.js";

const router = express.Router();

router.use(verifyAccessToken);

//get all root user media
router.get("/", async (req, res) => {
  try {

    const media = await getAllUserPlaylists((req as AuthRequest).userID, req.query.searchText as string);
    res.json(media);
  } catch (err) {
    res.status(500).send(err);
  }
});
// audioFile routes

//upload audiofiles
router.post("/0/:playlistID", async (req, res) => {
  uploadAudioFile(req, res);
});

// get audiofile metadata
router.get("/info/0/:audioFileID", async (req, res) => {
  const audioFileID = req.params.audioFileID;
  try {
    const metadata = await getAudioFileInfo(+audioFileID);
    res.send(metadata);
  } catch (error) {
    res.status(500).send(error);
  }
});

// delete an audiofile
router.delete("/0/:audioFileID/:storageID", async (req, res) => {
  try {
    await deleteAudioFile(+req.params.audioFileID, req.params.storageID);
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

// get the playlist's metadata document. does not incude audiofiles
router.get("info/1/:playlistID", async (req, res) => {
  try {
    const playlist = await getPlaylistInfo(+req.params.playlistID);
    res.json(playlist);
  } catch (error) {
    res.status(500).send(error);
  }
});

// get playlist audiofiles
router.get("/1/:playlistID", async (req, res) => {
  try {
    const response = await getPlaylistAudioFiles(+req.params.playlistID);
    res.json(response);
  } catch (error) {
    res.status(500).json(error);
  }
});
// delete playlist
router.delete("/1/:playlistID", async (req, res) => {
  try {
    await deletePlaylist(
      (req as unknown as AuthRequest).userID,
      req.params.playlistID
    );
    res.json(200);
  } catch (error) {
    res.status(500).send(error);
  }
});

//shared playlists routes
router.get("/audiofile/most-played", async (req, res) => {
  try {
    const results = await mostPlayedAudioFiles(
      (req as AuthRequest).userID,
      Number(req.query.limit)
    );
    res.json(results);
  } catch (error) {
    res.status(500).json(error);
  }
});
router.get("/audiofile/history", async (req, res) => {
  try {
    // lilmit is required
    // skip is optional
    let skip: number | undefined = Number(req.query.skip);
    let limit: number | undefined = Number(req.query.limit);
    if (!skip) {
      skip = undefined;
    }

    const results = await getListeningHistory(
      (req as AuthRequest).userID,
      limit,
      skip
    );
    res.json(results);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.post("/audiofile/history/:audioFileID", async (req, res) => {
  try {
    const response = await addListeningHistory(
      (req as unknown as AuthRequest).userID,
      +req.params.audioFileID
    );
    res.sendStatus(200);
  } catch (error) {
    res.status(500).json(error);
  }
});
export default router;
