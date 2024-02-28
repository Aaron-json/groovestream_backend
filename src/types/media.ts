import { NullOrUndefined } from "./global.js";
import { PublicUserInfo } from "./user.js";
// values of the "type" property of each media type
export enum MediaType {
  AudioFile,
  Playlist,
  PlaylistAudioFile,
  SharedPlaylist,
  SharedPlaylistAudioFile,
}

export interface AudioFile {
  // media schemas contain a type to identify them
  // when types are mixed in the same object or array.
  // 0 - audioFile
  // 1 - playlist
  // 2 - playlist audioFile
  // 3 - shared playlist
  // 4 - shared playlist audioFile
  id: number;
  type:
    | MediaType.AudioFile
    | MediaType.PlaylistAudioFile
    | MediaType.SharedPlaylistAudioFile;
  storageId: string;
  filename: string;
  uploadedAt: string;
  uploadedBy: PublicUserInfo | number; // depending on whether you did a join to get user's data
  playlistId?: number | NullOrUndefined;
  title?: string | NullOrUndefined;
  album?: string | NullOrUndefined;
  artists?: string[] | NullOrUndefined;
  duration?: number | NullOrUndefined;
  trackNumber?: number | NullOrUndefined;
  trackTotal?: number | NullOrUndefined;
  genre?: string | NullOrUndefined;
  icon?:
    | {
        mimeType: string;
        data: string | Buffer;
      }
    | NullOrUndefined;
  format: {
    bitrate?: number | NullOrUndefined;
    channels?: number | NullOrUndefined;
    codec?: string | NullOrUndefined;
    container?: string | NullOrUndefined;
    mimeType: string;
    sampleRate?: number | NullOrUndefined;
  };
}

// Playlists

export interface Playlist {
  id: number;
  name: string;
  type: MediaType.Playlist | MediaType.SharedPlaylist;
  owner: PublicUserInfo;
  createdAt: string;
}
