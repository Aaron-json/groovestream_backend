import mongoose from "mongoose";
import { audioFileSchema } from "./audioFile.js";

export const playlistAudioFileSchema = new mongoose.Schema(
  {
    ...audioFileSchema.obj,
    // use the base audioField and add the ID of the
    // playlist that contains this song
    playlistID: {
      type: String,
      required: true,
    },
    // override the type from the base auioFile schema
    type: {
      type: Number,
      default: 2,
      immutable: true,
    },
  },
  {
    timestamps: true,
  }
);
