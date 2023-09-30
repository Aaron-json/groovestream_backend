const {
    createAccessToken,
    createRefreshToken,
    refreshTokenCookieOptions,
} = require("../auth/userAuthentication");

const issueAccessToken = (req, res) => {
    // issues a new access token, runs after the verifyRefreshToken middleware
    const {userID} = req;
    const accessToken = createAccessToken(userID);
    const refreshToken = createRefreshToken(userID);
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
    res.status(200).json({accessToken});
};

module.exports = {
    issueAccessToken,
};
