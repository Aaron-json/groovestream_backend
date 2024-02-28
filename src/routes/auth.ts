import express from "express";
import {
  login,
  issueAccessToken,
  logout,
} from "../controllers/auth/userAuth.js";
import {
  verifyRefreshToken,
  verifyAccessToken,
  refreshTokenCookieOptions,
} from "../controllers/auth/middleware.js";

const authRouter = express.Router();
authRouter.post("/login", async (req, res) => {
  try {
    const tokens = await login(req.body.email, req.body.password);
    res.cookie("refreshToken", tokens.refreshToken, refreshTokenCookieOptions);
    res.json(tokens);
  } catch (error) {
    console.log(error);
    res.sendStatus(403);
  }
});
authRouter.get("/refresh", verifyRefreshToken, issueAccessToken);
authRouter.post("/logout", verifyAccessToken, logout);

export default authRouter;
