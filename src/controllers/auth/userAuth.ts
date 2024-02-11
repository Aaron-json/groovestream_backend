import { userModel } from "../../db/schemas/user/userSchema.js";
import { compareSync } from "bcrypt";
import {
  AuthRequest,
  createAccessToken,
  createRefreshToken,
  refreshTokenCookieOptions,
} from "../auth/middleware.js";
import { Request, Response } from "express";
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body; // get password and email from request
    const query = await userModel.find(
      { email },
      { password: 1 },
      { lean: true }
    );
    if (query.length === 0) {
      throw new Error(`User with email: "${email}" does not exist`);
    } else if (query.length > 1) {
      throw new Error(`Multiple users with email: "${email}" found`);
    }

    const user = query[0];
    const validLogin = compareSync(password, user.password);
    if (!validLogin) {
      return res.sendStatus(403);
    }
    const accessToken = await createAccessToken(user._id);
    const refreshToken = await createRefreshToken(user._id);
    // send access token in json and the refresh token as a httpOnly cookie
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
    res.json({ accessToken });
  } catch (e) {
    res.status(400).send(e);
  }
};

export const logout = async (req: Request, res: Response) => {
  // browsers will only clear cookie if the name and options we pass in match ones of the
  // cookie we are trying to delete
  res.clearCookie("refreshToken", refreshTokenCookieOptions);
  res.sendStatus(200);
};

export const issueAccessToken = async (req: Request, res: Response) => {
  // issues a new access token, runs after the verifyRefreshToken middleware
  const { userID } = req as AuthRequest;
  const accessToken = await createAccessToken(userID);
  const refreshToken = await createRefreshToken(userID);
  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
  res.status(200).json({ accessToken });
};
