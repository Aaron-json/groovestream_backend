import { User } from "./user.js";

export interface Friend
  extends Pick<User, "firstName" | "lastName" | "username"> {
  since: string;
  friendshipID: number;
  friendID: number;
}

export interface PlaylistMember extends Pick<User, "username"> {
  // only expose public info since not all playlist members
  // are friends
  since: string;
  memberID: number;
  membershipID: number;
}
