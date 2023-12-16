const express = require("express");
const app = express();
require("dotenv").config();
const storage_client = require("./cloud_storage/storage_client");
const { dbConnect } = require("./db/connection/connect");
const cookieParser = require("cookie-parser");
const cors = require("cors");

//for dev purposes
const allowedOrigins = [process.env.DEV_HOST_NAME, "http://localhost:5173", "http://192.168.1.72:5173", "https://dapper-moonbeam-3645ad.netlify.app"];
// setup middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
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
  .then(() => app.listen(process.env.PORT))
  .catch((e) => console.log(e));
