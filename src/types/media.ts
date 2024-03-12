import { NullOrUndefined } from "./global.js";
import { PublicUserInfo } from "./user.js";

export enum MediaType {
  AudioFile,
  Playlist,
}

export interface AudioFile {
  id: number;
  type: MediaType.AudioFile;
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

export interface Playlist {
  id: number;
  type: MediaType.Playlist;
  name: string;
  owner: PublicUserInfo;
  createdAt: string;
}
