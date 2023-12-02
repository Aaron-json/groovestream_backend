const express = require("express");
const {
  deleteAudioFile,
  getAudioFileInfo,
  uploadAudioFile,
  downloadUserAudioFile
} = require("../controllers/media/audioFile");

const {
  createPlaylist,
  deletePlaylist,
  getPlaylistInfo,
} = require("../controllers/media/playlist");
const { deletePlaylistAudioFile, getPlaylistAudioFileInfo } = require("../controllers/media/playlistAudioFile")
const {
  getAllUserMedia,
} = require("../controllers/media/media");
const { verifyAccessToken } = require("../controllers/auth/userAuthentication");
const {
  createSharedPlaylist,
  addMemberToSharedPlaylist,
  removeMember,
  leaveSharedPlaylist,
  getSharedPlaylistInfo,
  deleteSharedPlaylist,
} = require("../controllers/media/sharedPlaylist");
const {
  downloadSharedPlaylistAudioFile,
  deleteSharedPlaylistAudioFile
} = require("../controllers/media/sharedPlaylistAudioFile")
//const multer = require('multer')
//const upload = multer() // uncomment when not using streaming functionality
const router = express.Router();

router.use(verifyAccessToken);

//endpoints specifically for uploading all types of audioFiles
router.post("/audioFile/:mediaType/:playlistID", uploadAudioFile)
//get all user media
router.route("/").get(getAllUserMedia);
// audioFile routes
router.get("/0/:audioFileID", downloadUserAudioFile);
router.get("/info/0/:audioFileID", getAudioFileInfo)
router.delete("/0/:audioFileID", deleteAudioFile);

// playlist routes
router.post("/1", createPlaylist);
router.get("/1/:playlistID", getPlaylistInfo)
router.delete("/1/:playlistID", deletePlaylist);

//playlist audio file routes
router.get("/2/:audioFileID", downloadUserAudioFile)
router.get("/info/2/:playlistID/:audioFileID", getPlaylistAudioFileInfo)
router.delete("/2/:audioFileID/:playlistID", deletePlaylistAudioFile);

//shared playlists routes
router.post("/3", createSharedPlaylist);
router.delete("/3/:playlistID", deleteSharedPlaylist);
router.put("/3/member/:playlistID", addMemberToSharedPlaylist);
router.delete(
  "/3/member/:playlistID/:memberID",
  removeMember
);
router.get("/3/:playlistID", getSharedPlaylistInfo)
// router.get("/info/4/:playlistID/:audioFileID", getSharedPlaylistAudioFileInfo)
router.delete("/3/member/:playlistID", leaveSharedPlaylist);
// router.put("/3/audioFile/:playlistID")

//shared playlist audiofile routes
router.delete("/4/:audioFileID/:playlistID", deleteSharedPlaylistAudioFile)
router.get("/4/:audioFileID/:playlistID", downloadSharedPlaylistAudioFile);
// get info about any media (deprecated) use media type specific info requests
// router.get("/info/:mediaType/:mediaID", getMediaInfo);

module.exports = router;
