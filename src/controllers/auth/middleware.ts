import jsonwebtoken from "jsonwebtoken";
import { Request, Response, CookieOptions } from "express";
export interface AuthRequest extends Request {
  userID: string;
}
enum Token {
  AccessToken,
  RefreshToken,
}
export interface TokenPayload {
  userID: string;
}
export const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 2 * 1000, // unit: milliseconds. (2 hours)
  sameSite: process.env.NODE_ENV !== "production" ? "strict" : "none", // in prod we send cross-site request to the server
  secure: process.env.NODE_ENV === "production",
};

export function createAccessToken(userID: string) {
  return new Promise<string>((resolve, reject) => {
    jsonwebtoken.sign(
      { userID },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: 60 * 30, // units: seconds. (30 minutes)
      },
      function (err, payload) {
        // use callback to avoid blocking the blocking the event loop since
        // crypto functions are cpu-heavy
        if (err) {
          reject(err);
        } else {
          console.log();
          resolve(payload!);
        }
      }
    );
  });
}

export function createRefreshToken(userID: string) {
  return new Promise<string>((resolve, reject) => {
    jsonwebtoken.sign(
      { userID },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: refreshTokenCookieOptions.maxAge
          ? refreshTokenCookieOptions.maxAge / 1000
          : 0, //convert milliseconds to seconds
      },
      function (err, token) {
        if (err) {
          reject(err);
        } else {
          resolve(token!);
        }
      }
    );
  });
}
function _verifyToken(token: string, type: Token) {
  return new Promise<TokenPayload>((resolve, reject) => {
    let secret;
    switch (type) {
      case Token.AccessToken:
        secret = process.env.ACCESS_TOKEN_SECRET;
        break;
      case Token.RefreshToken:
        secret = process.env.REFRESH_TOKEN_SECRET;
        break;
      default:
        reject(`Invalid token type: ${type}`);
    }
    jsonwebtoken.verify(token, secret!, function (err, tokenPayload) {
      if (err) {
        reject(err);
      } else {
        resolve(tokenPayload as TokenPayload);
      }
    });
  });
}

// middleware function
export async function verifyAccessToken(
  req: Request,
  res: Response,
  next: () => any
) {
  const authHeader = req.headers["authorization"];
  const accessToken = authHeader && authHeader.split(" ")[1];
  if (!accessToken) {
    // token or header does not exist
    return res.sendStatus(401);
  }
  try {
    // token exists, try to verify
    const payload = await _verifyToken(accessToken, Token.AccessToken);

    (req as AuthRequest).userID = payload.userID;
    next();
  } catch (e) {
    // the user should try to refresh their access token
    // using a valid refresh token.
    // the 401 status is reserved for this middleware ONLY to make it clear
    // when the client is supposed to refresh or not.
    console.log(e);
    res.sendStatus(401);
  }
}

export async function verifyRefreshToken(
  req: Request,
  res: Response,
  next: () => any
) {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.sendStatus(403);
  }
  try {
    const payload = await _verifyToken(refreshToken, Token.RefreshToken);
    (req as AuthRequest).userID = payload.userID;
    next();
  } catch (e) {
    res.status(403).send(e);
  }
}
