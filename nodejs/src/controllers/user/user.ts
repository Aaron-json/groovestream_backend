import storage_client from "../../storage/client.js";
import { hash } from "bcrypt";
import sharp from "sharp";
import { Request, Response } from "express";
import { AuthRequest } from "../auth/middleware.js";
import { Query, queryFn } from "../../db/connection/connect.js";
import { ProfilePicture, User } from "../../util/types/user.js";
import { ApiError } from "@google-cloud/storage";
import { ServerError } from "../../util/types/errors.js";

export async function getUser(
  userId: number,
  userFields?: User
): Promise<User> {
  const query: Query = {
    queryStr: `
    SELECT first_name, last_name, id, username, date_joined, date_of_birth
    FROM "user"
    WHERE id = $1
    `,
    params: [userId],
  };
  const res = await queryFn(query);
  if (res.rowCount === 0) {
    throw new Error(`User not found`);
  }
  const user = res?.rows[0];
  return parseDbUser(user);
}

export const createNewUser = async (userInfo: any) => {
  try {
    const passwordHash = await hash(userInfo.password, 10);
    const queryCfg: Query = {
      queryStr: `
      INSERT INTO "user" (first_name, last_name, username, date_of_birth, password_hash)
      VALUES ($1, $2, $3, $4, $5);
      `,
      params: [
        userInfo.firstName,
        userInfo.lastName,
        userInfo.username,
        userInfo.dateOfBirth,
        passwordHash,
      ],
    };
    const response = await queryFn(queryCfg);
  } catch (error: any) {
    if (error.code === "23505") {
      throw new ServerError("Username is already in use", 400, "INV01");
    }
    throw error;
  }
};
export const updateUserInfo = async (userID: number, updates: any) => {
  const allowedFieldsToDbMap: any = {
    firstName: "first_name",
    lastName: "last_name",
    username: "username",
    dateOfBirth: "date_of_birth",
  };

  const columns = Object.keys(updates);
  const params = [];
  const updateStrs = [];
  let counter = 1;
  for (const column of columns) {
    if (!allowedFieldsToDbMap[column]) {
      const message = `Column ${column} is not allowed`;
      throw new ServerError(message, 400, "INV01");
    }
    updateStrs.push(`${allowedFieldsToDbMap[column]} = $${counter}`);
    params.push(updates[column]);
    ++counter;
  }
  params.push(userID);
  const query: Query = {
    queryStr: `
    UPDATE "user"
    SET ${updateStrs.join(", ")}
    WHERE id = $${params.length}
    `,
    params,
  };
  const res = await queryFn(query);
};

export async function usernameExists(username: string) {
  const query: Query = {
    queryStr: `
    SELECT 1 FROM "user"
    WHERE
    username = $1
    `,
    params: [username],
  };
  const res = await queryFn(query);
  return res.rowCount > 0;
}

export const getProfilePicture = async (userID: number) => {
  try {
    const file = storage_client
      .bucket(process.env.USER_DATA_BUCKET)
      .file(`${userID}/profilePicture`);
    const dataRequest = await file.download();
    const response: ProfilePicture = {
      mimeType: "image/jpeg",
      encoding: "base64",
      data: dataRequest[0].toString("base64"),
    };
    return response;
  } catch (err) {
    // TODO: check the error from storage if it is a
    // 404
    if ((err as ApiError).code === 404) {
      return null;
    } else {
      throw err;
    }
  }
};

export const uploadProfilePhoto = async (
  userID: number,
  fileInfo: {
    buffer: Buffer;
    mimeType: string;
    size: number;
  }
) => {
  //parsed by multer middleware
  // profile photos are always stored as jpeg
  const compressedImage = await sharp(fileInfo.buffer)
    .resize(300, 300, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();
  const file = storage_client
    .bucket(process.env.USER_DATA_BUCKET)
    .file(`${userID}/profilePicture`);
  await file.save(compressedImage, {
    contentType: `image/jpeg`,
  });
};

export const deleteUser = async (req: Request, res: Response) => {
  const { userID } = req as AuthRequest;
  res.sendStatus(500);
};

export function parseDbUser(dbUser: any) {
  const user: User = {
    id: dbUser.id,
    firstName: dbUser.first_name,
    lastName: dbUser.last_name,
    username: dbUser.username,
    dateJoined: dbUser.date_joined.toISOString(),
    dateOfBirth: dbUser.date_of_birth.toISOString(),
  };
  return user;
}
