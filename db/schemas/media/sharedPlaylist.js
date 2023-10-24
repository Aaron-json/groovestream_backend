const mongoose = require("mongoose");
const { userPlaylistSchema } = require("./playlistSchema");

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
const sharedPlaylistSchema = new mongoose.Schema(
  {
    ...userPlaylistSchema.obj,
    type: {
      type: mongoose.Schema.Types.Number,
      default: 3,
      immutable: true,
    },
    owner: {
      type: mongoose.Schema.Types.String,
      required: true,
      index: true,
    },
    members: {
      type: [sharedPlaylistMemberSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const sharedPlaylistModel = mongoose.model(
  "SharedPlaylist",
  sharedPlaylistSchema,
  "sharedPlaylists"
);

module.exports = {
  sharedPlaylistSchema,
  sharedPlaylistModel,
};
