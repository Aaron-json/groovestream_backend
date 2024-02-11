/**
 * Defines all controllers for requests and functionalities that spans across all media types.
 * Also has reusable functionality that is the same for multiple media types
 * Ex. downloading a user's audio file. These are stores in the sama path in storage
 */
import { userModel } from "../../db/schemas/user/userSchema.js";
/**
 * @param {string} userID
 * @returns Array of all media that the user has in their library
 */
export async function getAllUserMedia(userID: string) {
  const playlistProjection = {
    "playlists.type": 1,
    "playlists._id": 1,
    "playlists.name": 1,
    "playlists.createdAt": 1,
    "playlists.audioFiles._id": 1,
  };
  const sharedPlaylistPopulateFields = {
    _id: 1,
    type: 1,
    name: 1,
    createdAt: 1,
    owner: 1,
    "audioFiles._id": 1,
  };

  const mediaQuery = await userModel
    .findById(userID, {
      ...playlistProjection,
      sharedPlaylists: 1,
      audioFiles: 1,
      _id: 0,
    })
    .populate("sharedPlaylists", sharedPlaylistPopulateFields);
  if (!mediaQuery) {
    throw new Error("COuld not find user");
  }
  const { playlists, sharedPlaylists, audioFiles } = mediaQuery;
  const allMedia = [...playlists, ...sharedPlaylists, ...audioFiles];
  return allMedia;
}
