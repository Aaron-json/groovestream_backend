const express = require("express");
const {
  verifyRefreshToken,
  verifyAccessToken,
} = require("../auth/userAuthentication");
const { issueAccessToken } = require("../controllers/refreshToken");
const router = express.Router();

router.route("/").get(verifyRefreshToken, issueAccessToken);

module.exports = router;
