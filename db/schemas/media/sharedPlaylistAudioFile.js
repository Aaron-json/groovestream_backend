const mongoose = require("mongoose");
const { audioFileSchema } = require("./audioFileSchema");
const uuid = require("uuid");
const sharedPlaylistAudioFileSchema = new mongoose.Schema(
  {
    ...audioFileSchema.obj,

    type: {
      type: mongoose.Schema.Types.Number,
      default: 4,
    },
    sharedPlaylistID: {
      type: mongoose.Schema.Types.String,
      required: true,
      ref: "sharedPlaylist",
    },
  },
  {
    timestamps: true,
  }
);
