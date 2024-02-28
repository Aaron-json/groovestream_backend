import { Playlist } from "./media.js";
import { PublicUserInfo } from "./user.js";
interface Invite {
  id: number;
  // when not populated from and to can just contain the user id
  from: PublicUserInfo | number;
  to: PublicUserInfo | number;
  sentAt: string;
}

export interface PlaylistInvite extends Invite {
  playlist: Pick<Playlist, "name" | "owner" | "id"> | number;
}

export interface FriendRequest extends Invite {}
