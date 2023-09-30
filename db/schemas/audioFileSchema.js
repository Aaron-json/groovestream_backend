const mongoose = require("mongoose");
const uuid = require("uuid");

// const iconSchema = new mongoose.Schema({
//   mimeType: {
//     type: String,
//     default: null,
//   },
//   data: {
//     type: mongoose.SchemaTypes.Buffer,
//     default: null,
//   },
// });
const audioFileSchema = new mongoose.Schema({
  // media schemas contain a type to identify them.
  // 0 - audioFile
  // 1 - playlist
  // 2 - artist
  // 3 - shared playlist
  _id: {
    type: String,
    default: () => uuid.v4(),
  },
  type: {
    type: Number,
    default: 0,
    immutable: true,
  },
  filename: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: null,
  },
  album: {
    type: String,
    default: null,
  },
  artists: {
    type: mongoose.SchemaTypes.Array,
    default: null,
  },
  trackNumber: {
    type: String,
    default: null,
  },
  genre: {
    type: String,
    default: null,
  },
  icon: {
    mimeType: {
      type: String,
      default: null,
    },
    data: {
      type: mongoose.SchemaTypes.String,
      default: null,
      //   get: function (data) {
      //     return Buffer(data).toString('base64'); // convert buffer to base64 string
      //   },
      //   set: function (data) {
      //     return data
      //   }
    },
  },
  dateUploaded: {
    type: Date,
    immutable: true,
    default: () => Date.now(),
  },
  paybackCount: {
    type: Number,
    default: 0,
  },
  lastPlayed: {
    type: Date,
    default: null,
  },
  format: {
    type: mongoose.SchemaTypes.Mixed,
    default: null,
  },
  duration: {
    type: Number,
    default: null,
  },
});

const audioFileModel = mongoose.model("audioFile", audioFileSchema);

module.exports = {
  audioFileSchema,
  audioFileModel,
};
