import { Storage } from "@google-cloud/storage";
import path from "path";
import { fileURLToPath } from "url";
// Initialize google cloud storage client
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const storageClient = new Storage({
  keyFilename: path.join(
    __dirname,
    "../../" + process.env.G00GLE_CLOUD_KEY_FILE
  ),
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});
export async function storageTestConnect() {
  // check is the two buckets we use to store and retrieve data exist
  // to server as a test since the library does not have pinging functionality
  const exists = await Promise.all([
    storageClient.bucket(process.env.GLOBAL_AUDIOFILES_BUCKET).exists(),
    storageClient.bucket(process.env.USER_DATA_BUCKET).exists(),
  ]);

  for (const existsRes of exists) {
    if (!existsRes[0]) {
      throw new Error("Bucket does not exist");
    }
  }
}

export default storageClient;
