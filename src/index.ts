import express from "express";
import { storageTestConnect } from "./cloud_storage/storage_client.js";
import { dbConnect } from "./db/connection/connect.js";
import cookieParser from "cookie-parser";
import cors from "cors";

import userRouter from "./routes/user.js";
import mediaRouter from "./routes/media.js";
import friendRouter from "./routes/social.js";
import authRouter from "./routes/auth.js";

const app = express();
const PORT = process.env.NODE_ENV === "production" ? process.env.PORT : 5001;

const ORIGIN =
  process.env.NODE_ENV === "production"
    ? "https://www.groovestreamapp.com"
    : "http://localhost:5173";

// setup middleware
const CORS_OPTIONS = {
  origin: ORIGIN,
  credentials: true,
};

app.use(cors(CORS_OPTIONS));
app.use(cookieParser());
app.use(express.json());
// config routers

app.use("/user", userRouter);
app.use("/media", mediaRouter);
app.use("/auth", authRouter);
app.use("/social", friendRouter);

async function main() {
  try {
    await Promise.all([dbConnect(), storageTestConnect()]);
    app.listen(PORT);
    if (process.env.NODE_ENV !== "production") {
      console.log("Successfully started");
    }
  } catch (error) {
    console.log(error);
  }
}
main();
