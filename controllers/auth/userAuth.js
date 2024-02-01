const { userModel } = require("../../db/schemas/user/userSchema")
const { cleanUp } = require("../media/clean")
const { compareSync } = require("bcrypt")
const {
    createAccessToken,
    createRefreshToken,
    refreshTokenCookieOptions,
} = require("../auth/middleware");

const login = async (req, res) => {
    try {

        const { email, password } = req.body; // get password and email from request
        const query = await userModel.find({ email }, { password: 1 });
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
        delete user.password; // do not send password back to user. remove after verification
        const accessToken = createAccessToken(user._id.toString());
        const refreshToken = createRefreshToken(user._id.toString());
        // send access token in json and the refresh token as a httpOnly cookie
        res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
        res.json({ accessToken });
        cleanUp(user._id)
    } catch (e) {
        res.status(400).send(e);
    }
};

const logout = async (req, res) => {
    // browsers will only clear cookie if the name and options we pass in match ones of the
    // cookie we are trying to delete
    res.clearCookie("refreshToken", refreshTokenCookieOptions);
    res.sendStatus(200);
};

const issueAccessToken = (req, res) => {
    // issues a new access token, runs after the verifyRefreshToken middleware
    const { userID } = req;
    const accessToken = createAccessToken(userID);
    const refreshToken = createRefreshToken(userID);
    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);
    res.status(200).json({ accessToken });
};

module.exports = {
    login,
    logout,
    issueAccessToken
}