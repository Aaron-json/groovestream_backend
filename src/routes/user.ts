import express from "express";
import multer from "multer";
const router = express.Router();
import {
  createNewUser,
  getUser,
  deleteUser,
  updateUserInfo,
  uploadProfilePhoto,
} from "../controllers/user/userController.js";
import { verifyAccessToken } from "../controllers/auth/middleware.js";

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
export default router;
