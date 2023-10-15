const mongoose = require("mongoose");

const friendSchema = new mongoose.Schema(
  {
    friendID: {
      type: mongoose.Schema.Types.String,
      required: true,
      ref: "users",
    },
  },
  {
    _id: false,
    timestamps: true,
  }
);

module.exports = {
  friendSchema,
};
