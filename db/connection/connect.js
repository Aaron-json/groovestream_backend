const mongoose = require("mongoose");

const connectionURL = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@groovestream.tgewr6r.mongodb.net/?retryWrites=true&w=majority`;

const dbConnect = async () => {
  await mongoose.connect(connectionURL, {
    dbName: process.env.DATABASE_NAME,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Database connection successful");
};

module.exports = dbConnect;
