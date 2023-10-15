const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  createNewUser,
  getUser,
  deleteUser,
  login,
  logout,
  getRecentSearches,
  addRecentSearch,
  deleteRecentSearch,
  updateUserInfo,
  uploadProfilePhoto,
} = require("../controllers/user/userController");
const {verifyAccessToken} = require("../controllers/auth/userAuthentication");

router.post("/login", login);
router.post("/logout", verifyAccessToken, logout);

router
  .route("/")
  .post(createNewUser)
  .get(verifyAccessToken, getUser)
  .delete(verifyAccessToken, deleteUser)
  .put(verifyAccessToken, updateUserInfo);

const upload = multer({
  storage: multer.memoryStorage(),
});
router
  .route("/profilePicture")
  .put(verifyAccessToken, upload.single("files"), uploadProfilePhoto);

router
  .route("/recentSearches")
  .get(verifyAccessToken, getRecentSearches)
  .post(verifyAccessToken, addRecentSearch)
  .delete(verifyAccessToken, deleteRecentSearch);

// router.get("/:param", router, getUserParam);
module.exports = router;
