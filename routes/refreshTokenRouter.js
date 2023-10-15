const express = require("express");
const {
  verifyRefreshToken,
} = require("../controllers/auth/userAuthentication");
const {issueAccessToken} = require("../controllers/auth/refreshToken");
const router = express.Router();

router.route("/").get(verifyRefreshToken, issueAccessToken);

module.exports = router;
