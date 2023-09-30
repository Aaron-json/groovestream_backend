const mongoose = require("mongoose");
const { audioFileSchema } = require("./audioFileSchema");

const playlistAudioFileSchema = mongoose.Schema({
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
});

module.exports = {
  playlistAudioFileSchema,
};
