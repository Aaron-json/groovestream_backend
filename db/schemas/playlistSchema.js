const mongoose = require("mongoose");
const { playlistAudioFileSchema } = require("./playlistAudioFile");
const uuid = require("uuid");

const userPlaylistSchema = new mongoose.Schema({
  // media schemas contain a type to identify them.
  // 0 - audioFile
  // 1 - playlist
  // 2 - playlistAudioFile
  // 3 - artist
  // 4 - shared playlist
  _id: {
    type: String,
    default: () => uuid.v4(),
  },
  type: {
    type: Number,
    default: 1,
    immutable: true,
  },
  name: {
    type: String,
    required: true,
  },
  dateCreated: {
    immutable: true,
    type: Date,
    default: () => Date.now(),
  },
  audioFiles: {
    type: [playlistAudioFileSchema],
    default: [],
  },
  playbackCount: {
    type: Number,
    default: 0,
  },
  lastPlayed: { type: Date, default: null },
});

// future shared playlists will be used
module.exports = { userPlaylistSchema };
