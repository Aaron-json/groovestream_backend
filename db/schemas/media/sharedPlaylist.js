const mongoose = require("mongoose");
const { userPlaylistSchema } = require("./playlist");
const { audioFileSchema } = require("./audioFile");
const sharedPlaylistMemberSchema = new mongoose.Schema(
  {
    memberID: {
      type: mongoose.Schema.Types.String,
      ref: "User",
      required: true,
    },
  },
  {
    _id: false,
    timestamps: true,
  }
);
const sharedPlaylistAudioFileSchema = new mongoose.Schema(
  {
    ...audioFileSchema.obj,

    type: {
      type: mongoose.Schema.Types.Number,
      default: 4,
    },
    playlistID: {
      type: mongoose.Schema.Types.String,
      required: true,
      ref: "sharedPlaylist",
    },
    uploadedBy: {
      type: sharedPlaylistMemberSchema,
      required: true,
      immutable: true,
    }
  },
  {
    timestamps: true,
  }
);

const sharedPlaylistSchema = new mongoose.Schema(
  {
    ...userPlaylistSchema.obj,
    type: {
      type: mongoose.Schema.Types.Number,
      default: 3,
      immutable: true,
    },
    // owner cannot be changed
    owner: {
      type: mongoose.Schema.Types.String,
      required: true,
      index: true,
      ref: "User",
    },
    // playlists already has an audioFiles fields however, it accepts
    // objects of a different schema.
    audioFiles: {
      type: [sharedPlaylistAudioFileSchema],
      default: [],
    },
    members: {
      type: [sharedPlaylistMemberSchema],
      default: [],
    },

  },
  { timestamps: true }
);

const sharedPlaylistModel = mongoose.model(
  "sharedPlaylist",
  sharedPlaylistSchema,
  "sharedPlaylists"
);

module.exports = {
  sharedPlaylistSchema,
  sharedPlaylistModel,
  sharedPlaylistMemberSchema
};
