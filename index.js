const express = require("express");
const app = express();
const storage_client = require("./cloud_storage/storage_client");
const { dbConnect } = require("./db/connection/connect");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const PORT = process.env.NODE_ENV === "production" ? process.env.PORT : 5001
const allowedOrigins = ["https://groovestream.netlify.app", "https://www.groovestreamapp.com"]
const ORIGIN = process.env.NODE_ENV === "production" ? allowedOrigins : "http://localhost:5173"

// setup middleware
const CORS_OPTIONS = {
  origin: ORIGIN,
  credentials: true,
}

app.use(cors(CORS_OPTIONS));
app.use(cookieParser());
app.use(express.json());
// config routers
const userRouter = require("./routes/userRoutes");
const mediaRouter = require("./routes/mediaRoutes");
const friendRouter = require("./routes/friendsRoutes");
const authRouter = require("./routes/auth");

app.use("/user", userRouter);
app.use("/media", mediaRouter);
app.use("/auth", authRouter);
app.use("/social", friendRouter)

async function initServer() {
  // check if database and storage are functional
  await dbConnect();
  const testBucket = storage_client.bucket(
    process.env.GOOGLE_CLOUD_TEST_BUCKET
  );
}

initServer()
  .then(() => app.listen(PORT))
  .catch();
