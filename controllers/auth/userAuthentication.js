const { sign, verify } = require("jsonwebtoken");

const refreshTokenCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 2 * 1000, // unit: milliseconds. (2 hours)
  sameSite: "strict",
  secure: false,
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
    console.log("valid access token");
    next();
  } catch (e) {
    // token could not be verified
    console.log("not a valid access token");
    res.sendStatus(401);
  }
};

const verifyRefreshToken = (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;
  console.log("working on refesh token verification...");

  // console.log(req.headers);
  if (!refreshToken) {
    // token or header does not exist
    console.log(`no refresh token found`);
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
    console.log("not a valid refresh token");

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