const express = require("express");
const {
  uploadAudioFile,
  createPlaylist,
  downloadAudioFile,
  deleteAudioFile,
  deletePlaylist,
  getMediaInfo,
} = require("../controllers/mediaController");
const { verifyAccessToken } = require("../auth/userAuthentication");
//const multer = require('multer')
//const upload = multer() // uncomment when not using streaming functionality
const router = express.Router();

router.use(verifyAccessToken);
// audioFile routes
router.post("/0", uploadAudioFile);
router.get("/0/:audioFileID", downloadAudioFile);
router.delete("/0/:audioFileID", deleteAudioFile);
router.delete("/2/:audioFileID/:playlistID", deleteAudioFile);

// playlist routes
router.post("/1", createPlaylist);
router.post("/2/:playlistID", uploadAudioFile);
router.delete("/1/:playlistID", deletePlaylist);

// get info about media
router.get("/info/:mediaType/:mediaID", getMediaInfo);

module.exports = router;
