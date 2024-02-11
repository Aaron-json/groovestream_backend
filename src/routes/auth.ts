import express from "express";
import {
  login,
  issueAccessToken,
  logout,
} from "../controllers/auth/userAuth.js";
import {
  verifyRefreshToken,
  verifyAccessToken,
} from "../controllers/auth/middleware.js";

const authRouter = express.Router();
authRouter.post("/login", login);
authRouter.get("/refresh", verifyRefreshToken, issueAccessToken);
authRouter.post("/logout", verifyAccessToken, logout);

export default authRouter;
