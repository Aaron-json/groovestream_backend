import { AudioFile } from "./media.js";

export interface ListeningActivity {
  playedAt: string;
  audioFile: AudioFile;
}

export type ListeningHistory = ListeningActivity[];
