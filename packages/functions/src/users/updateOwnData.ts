import { PrismaClient } from "@prisma/client";
import { ApiHandler, useJsonBody } from "sst/node/api";

const prisma = new PrismaClient();

interface Body {
  gamertag?: string;
  description?: string;
  country?: string;
  only_same_country?: boolean;
  age?: number;
  competitive?: boolean;
  push_token?: string;
  push_notifications?: boolean;
  only_local?: boolean;
}

export const handler = ApiHandler(async (_evt) => {
  const { sub } = _evt.requestContext?.authorizer?.jwt?.claims;
  const {
    gamertag,
    description,
    country,
    only_same_country,
    age,
    competitive,
    push_token,
    push_notifications,
    only_local,
  } = useJsonBody() as Body;

  try {
    const updateData = {
      ...(gamertag && { gamertag: gamertag }),
      ...(description && { description }),
      ...(country && { country }),
      ...(only_same_country && { only_same_country }),
      ...(age && { age }),
      ...(competitive !== undefined && { competitive }),
      ...(push_token && { push_token: push_token }),
      ...(push_notifications !== undefined && { push_notifications }),
      ...(only_local !== undefined && { only_local }),
    };

    if (Object.keys(updateData).length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "No valid fields provided for update.",
        }),
      };
    }

    const user = await prisma.users.update({
      where: {
        uuid: sub,
      },
      data: updateData,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(user),
    };
  } catch (error) {
    console.error("Error updating user:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
});
