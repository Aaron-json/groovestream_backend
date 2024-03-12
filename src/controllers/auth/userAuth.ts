import { compare } from "bcrypt";
import {
  AuthRequest,
  createAccessToken,
  createRefreshToken,
  refreshTokenCookieOptions,
} from "../auth/middleware.js";
import { Request, Response } from "express";
import { Query, queryFn } from "../../db/connection/connect.js";
export const login = async (username: number, password: string) => {
  const query: Query = {
    queryStr: `
    SELECT password_hash, id from "user"
    WHERE username = $1;
    `,
    params: [username],
  };
  const response = await queryFn(query);
  if (response?.rowCount === 0) {
    throw new Error(`User with username '${username}' does not exist`);
  }

  const valid = await compare(password, response?.rows[0].password_hash);
  if (!valid) {
    throw new Error(`Login failed`);
  }
  const userId = response?.rows[0].id;
  const accessToken = await createAccessToken(userId);
  const refreshToken = await createRefreshToken(userId);
  return { accessToken, refreshToken };
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
