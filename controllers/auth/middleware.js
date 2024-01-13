const { sign, verify } = require("jsonwebtoken");

const refreshTokenCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 2 * 1000, // unit: milliseconds. (2 hours)
  sameSite: process.env.ENV_MODE === "dev" ? "strict" : "none", // in prod we send cross-site request to the server
  secure: process.env.ENV_MODE !== "dev",
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
  const accessToken = authHeader && authHeader.split(" ")[1]; // check if we have authorization header
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
    // token could not be verified
    res.sendStatus(401);
  }
};

const verifyRefreshToken = (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    // token or header does not exist
    return res.sendStatus(401);
  }
  try {
    const refreshTokenPayload = verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const { userID } = refreshTokenPayload;
    req.userID = userID;
    // this is middleware call next function
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
