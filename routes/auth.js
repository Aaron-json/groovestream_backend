const express = require("express")
const { login, issueAccessToken, logout } = require("../controllers/auth/userAuth")
const { verifyRefreshToken, verifyAccessToken } = require("../controllers/auth/middleware")

const authRouter = express.Router()
authRouter.get("/refresh", verifyRefreshToken, issueAccessToken)
authRouter.post("/login", login)
authRouter.post("/logout", verifyAccessToken, logout)

module.exports = authRouter