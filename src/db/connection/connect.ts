import mongoose from "mongoose";

const connectionURL = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@groovestream.tgewr6r.mongodb.net/?retryWrites=true&w=majority`;

const options: mongoose.ConnectOptions = {
  serverApi: { version: "1", strict: true, deprecationErrors: true },
  dbName: process.env.DATABASE_NAME,
};
export const dbConnect = async () => {
  try {
    await mongoose.connect(connectionURL, options);
    await mongoose.connection.db.admin().command({ ping: 1 });
  } catch (error) {
    await mongoose.disconnect();
    // catch error for clean disconnect and throw error back to caller
    throw error;
  }
};
