import mongoose from "mongoose";
import { playlistAudioFileSchema } from "./playlistAudioFile.js";
import * as uuid from "uuid";

export const userPlaylistSchema = new mongoose.Schema(
  {
    // media schemas contain a type to identify them.
    // 0 - audioFile
    // 1 - playlist
    // 2 - playlistAudioFile

    _id: {
      type: mongoose.Schema.Types.String,
      default: () => uuid.v4(),
    },
    type: {
      type: mongoose.Schema.Types.Number,
      default: 1,
      immutable: true,
    },
    name: {
      type: String,
      required: true,
    },

    audioFiles: {
      type: [playlistAudioFileSchema],
      default: [],
    },
    playbackCount: {
      type: mongoose.Schema.Types.Number,
      default: 0,
    },
    lastPlayed: { type: mongoose.Schema.Types.Date, default: null },
  },
  {
    timestamps: true,
  }
);
