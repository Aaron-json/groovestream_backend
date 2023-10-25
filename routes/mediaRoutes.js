const express = require("express");
const {
  uploadAudioFile,
  downloadAudioFile,
  deleteAudioFile,
} = require("../controllers/media/userAudioFileController")
const {
  createPlaylist,
  deletePlaylist,
} = require("../controllers/media/playlistController")
const {
  getMediaInfo,
} = require("../controllers/media/mediaController");
const {verifyAccessToken} = require("../controllers/auth/userAuthentication");
const { createSharedPlaylist, addMemberToSharedPlaylist, removeMemberFromSharedPlaylist, leaveSharedPlaylist } = require("../controllers/media/sharedPlaylistController");
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


//shared playlists routes
router.post("/3", createSharedPlaylist);
router.put("/3/member/:playlistID", addMemberToSharedPlaylist);
router.delete("/3/member/:playlistID/:memberID", removeMemberFromSharedPlaylist)
router.delete("/3/member/:playlistID", leaveSharedPlaylist);
// router.put("/3/audioFile/:playlistID")




// get info about any media
router.get("/info/:mediaType/:mediaID", getMediaInfo);

module.exports = router;
