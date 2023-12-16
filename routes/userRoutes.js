const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  createNewUser,
  getUser,
  deleteUser,
  updateUserInfo,
  uploadProfilePhoto,
} = require("../controllers/user/userController");
const { verifyAccessToken } = require("../controllers/auth/middleware");

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


// router.get("/:param", router, getUserParam);
module.exports = router;
