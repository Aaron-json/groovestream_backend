const express = require("express");
const {
  deleteAudioFile,
  getAudioFileInfo,
  uploadAudioFile,
  downloadAudioFile
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
const { verifyAccessToken } = require("../controllers/auth/middleware");
const {
  createSharedPlaylist,
  removeMember,
  leaveSharedPlaylist,
  getSharedPlaylistInfo,
  deleteSharedPlaylist,
  sendPlaylistInvite,
  acceptPlaylistInvite,
  rejectPlaylistInvite,
  getSharedPlaylistsInvites,
} = require("../controllers/media/sharedPlaylist");
const {
  deleteSharedPlaylistAudioFile
} = require("../controllers/media/sharedPlaylistAudioFile");
//const multer = require('multer')
//const upload = multer() // uncomment when not using streaming functionality
const router = express.Router();

router.use(verifyAccessToken);

//endpoints specifically for handling all types of audioFile
// uplaod and downloads. their controllers directly interact with res and req
// objects so they receive them directly
router.post("/audioFile/:mediaType/", uploadAudioFile)
router.post("/audioFile/:mediaType/:playlistID", uploadAudioFile)
router.get("/audiofile/:mediaType/:audioFileID", downloadAudioFile)
router.get("/audiofile/:mediaType/:audioFileID/:playlistID", downloadAudioFile)
//get all user media
router.route("/").get(async (req, res) => {
  try {
    const media = await getAllUserMedia(req.userID)
    res.json(media)
  } catch (err) {
    res.status(500).send(err)
  }
});
// audioFile routes
// get audiofile metadata
router.get("/info/0/:audioFileID", async (req, res) => {
  const { userID } = req
  const { audioFileID } = req.params
  try {
    const metadata = await getAudioFileInfo(userID, audioFileID)
    res.send(metadata)

  } catch (error) {
    res.status(500).send(error)
  }
})

// delete an audiofile
router.delete("/0/:audioFileID", async (req, res) => {
  try {
    await deleteAudioFile(req.userID, req.params.audioFileID)
    res.sendStatus(200)
  } catch (error) {
    res.status(500).send(error)
  }
});

// playlist routes
// create playlist
router.post("/1", async (req, res) => {
  try {

    await createPlaylist(req.userID, req.body.name)
    res.sendStatus(201)
  } catch (error) {
    res.status(500).send(error)
  }
});

// get the playlist's metadata document
router.get("/1/:playlistID", async (req, res) => {
  try {
    const playlist = await getPlaylistInfo(req.userID, req.params.playlistID)
    res.send(playlist)
  } catch (error) {
    res.status(500).send(error)
  }
})

router.delete("/1/:playlistID", async (req, res) => {
  try {
    await deletePlaylist(req.userID, req.params.playlistID)
  } catch (error) {
    res.status(500).send(error)
  }
});
//playlist audio file routes
// get playlist audio file metadata
router.get("/info/2/:playlistID/:audioFileID", async (req, res) => {
  try {
    const info = await getPlaylistAudioFileInfo(req.userID, req.params.audioFileID, req.params.playlistID)
    res.send(info)
  } catch (error) {
    res.status(500).json(error)
  }
})
// delete playlist audiofile
router.delete("/2/:audioFileID/:playlistID", async (req, res) => {
  try {
    await deletePlaylistAudioFile(req.userID, req.params.audioFileID, req.params.playlistID)
    res.sendStatus(200)
  } catch (error) {
    res.status(500).send(error)
  }
});

//shared playlists routes
// create new shared playlist
router.post("/3", async (req, res) => {
  try {
    await createSharedPlaylist(req.userID, req.body.name)
    res.sendStatus(201)
  } catch (error) {
    res.status(500).send(error)
  }
});
// delete shared playlist
router.delete("/3/:playlistID", async (req, res) => {
  try {
    await deleteSharedPlaylist(req.userID, req.params.playlistID)
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error)
  }
});
// get user's playlist invites
router.get("/3/invites", async (req, res) => {
  try {
    const invites = await getSharedPlaylistsInvites(req.userID)
    res.json(invites)
  } catch (error) {
    res.status(500).send(error)
  }
})
// invite a user to a playlist
router.post("/3/invite/:playlistID", async (req, res) => {
  try {
    await sendPlaylistInvite(req.userID, req.params.playlistID, req.body.memberEmail)
    res.sendStatus(200)
  } catch (error) {
    res.status(500).send(error)
  }
})
// accept an invite to a playlist
router.post("/3/member/:senderID/:playlistID", async (req, res) => {
  try {
    await acceptPlaylistInvite(req.userID, req.params.playlistID, req.params.senderID)
    res.sendStatus(200)
  } catch (error) {
    res.status(500).send(error)
  }
})
// reject / delete a user's invite
router.delete("/3/invite/:senderID/:playlistID", async (req, res) => {
  try {
    await rejectPlaylistInvite(req.userID, req.params.playlistID, req.params.senderID)
    res.sendStatus(200)
  } catch (error) {
    res.status(500).send(error)
  }
})
// remove member from shared playlist
router.delete("/3/member/:playlistID/:memberID", async (req, res) => {
  try {
    await removeMember(req.userID, req.params.playlistID, req.params.memberID)
    res.sendStatus(200)
  } catch (error) {
    res.status(500).send(error)
  }
});
// get shared playlist info
router.get("/3/:playlistID", async (req, res) => {
  try {
    const info = await getSharedPlaylistInfo(req.userID, req.params.playlistID)
    res.send(info)
  } catch (error) {
    res.status(500).send(error)
  }
})
// router.get("/info/4/:playlistID/:audioFileID", getSharedPlaylistAudioFileInfo)
// leave a shared playlist
router.delete("/3/member/:playlistID", async (req, res) => {
  try {
    await leaveSharedPlaylist(req.userID, req.params.playlistID)
    res.sendStatus(200)
  } catch (error) {
    res.status(500).send(error)
  }
});

//shared playlist audiofile routes
router.delete("/4/:audioFileID/:playlistID", async (req, res) => {
  try {
    await deleteSharedPlaylistAudioFile()
    res.sendStatus(200)
  } catch (error) {
    res.status(500).send(error)
  }
})
// get info about any media (deprecated) use media type specific info requests
// router.get("/info/:mediaType/:mediaID", getMediaInfo);

module.exports = router;
