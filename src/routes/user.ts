import express from "express";
import multer from "multer";
const router = express.Router();
import {
  createNewUser,
  getUser,
  deleteUser,
  updateUserInfo,
  uploadProfilePhoto,
  getProfilePicture,
} from "../controllers/user/user.js";
import {
  AuthRequest,
  verifyAccessToken,
} from "../controllers/auth/middleware.js";
import { ServerError } from "../types/errors.js";

router
  .route("/")
  .post(async (req, res) => {
    try {
      await createNewUser(req.body);
      res.sendStatus(201);
    } catch (error: any) {
      if (error instanceof ServerError) {
        return res.status(error.httpCode).json(error);
      }
      return res.status(500).json(error);
    }
  })
  .get(verifyAccessToken, async (req, res) => {
    try {
      const userInfo = await getUser((req as AuthRequest).userID, req.body);
      res.json(userInfo);
    } catch (error) {
      res.status(500).json(error);
    }
  })
  .delete(verifyAccessToken, deleteUser)
  .patch(verifyAccessToken, async (req, res) => {
    try {
      await updateUserInfo((req as AuthRequest).userID, req.body);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json(error);
    }
  });

const upload = multer({
  storage: multer.memoryStorage(),
});
router
  .route("/profilePicture")
  .put(verifyAccessToken, upload.single("files"), async (req, res) => {
    try {
      if (!req.file) {
        return res.sendStatus(400);
      }
      const userID = (req as AuthRequest).userID;
      const profPic = await uploadProfilePhoto(userID, {
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
        size: req.file.size,
      });
      res.sendStatus(201);
    } catch (error) {
      res.sendStatus(500);
    }
  })
  .get(verifyAccessToken, async (req, res) => {
    try {
      const picture = await getProfilePicture((req as AuthRequest).userID);
      res.json(picture);
      return picture;
    } catch (error) {
      res.sendStatus(500);
    }
  });
router.get("/profilePicture/:userID", async (req, res) => {
  try {
    const picture = await getProfilePicture(+req.params.userID);
    res.json(picture);
  } catch (error) {
    res.sendStatus(500);
  }
});

// router.get("/:param", router, getUserParam);
export default router;
