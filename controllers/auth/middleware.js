const { sign, verify } = require("jsonwebtoken");

const refreshTokenCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 2 * 1000, // unit: milliseconds. (2 hours)
  sameSite: process.env.NODE_ENV !== "production" ? "strict" : "none", // in prod we send cross-site request to the server
  secure: process.env.NODE_ENV === "production",
};

const createAccessToken = (userID) => {
  const accessToken = sign({ userID }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: 60 * 30, // units: seconds. (30 minutes)
  });

  return accessToken;
};

const createRefreshToken = (userID) => {
  const refreshToken = sign({ userID }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: refreshTokenCookieOptions.maxAge / 1000, //convert milliseconds to seconds
  });
  return refreshToken;
};

// middleware function
const verifyAccessToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const accessToken = authHeader && authHeader.split(" ")[1];
  if (!accessToken) {
    // token or header does not exist
    return res.sendStatus(401);
  }

  try {
    // token exists, try to verify
    const accessTokenPayload = verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );
    const { userID } = accessTokenPayload;
    req.userID = userID;
    next();
  } catch (e) {
    // the user should try to refresh their access token
    // using a valid refresh token.
    // the 401 status is reserved for this middleware ONLY to make it clear
    // when the client is supposed to refresh or not.
    res.sendStatus(401);
  }
};

const verifyRefreshToken = (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.sendStatus(403);
  }
  try {
    const refreshTokenPayload = verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const { userID } = refreshTokenPayload;
    req.userID = userID;
    next();
  } catch (e) {
    res.status(403).send(e);
  }
};

module.exports = {
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  refreshTokenCookieOptions,
};
