import { PrismaClient } from "@prisma/client";
import { ApiHandler, usePathParams } from "sst/node/api";

const prisma = new PrismaClient();

const matchedUuidFromMatch = (match: any, sub: string) => {
  if (match.user_uuid1 === sub) {
    return match.user_uuid2;
  } else {
    return match.user_uuid1;
  }
};

export const handler = ApiHandler(async (_evt) => {
  try {
    const { sub } = _evt.requestContext?.authorizer?.jwt?.claims;
    const { connectionId } = usePathParams();

    const match = await prisma.connections.findFirst({
      where: {
        uuid: connectionId,
      },
    });
    if (!match) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Match does not exist",
        }),
      };
    }

    if (match.user_uuid1 !== sub && match.user_uuid2 !== sub) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "You are not part of this match",
        }),
      };
    }

    const chat = await prisma.chats.findMany({
      where: {
        connection_uuid: connectionId,
      },
      orderBy: {
        time_stamp: "asc",
      },
    });

    const userUuid = matchedUuidFromMatch(match, sub);

    const user = await prisma.users.findUnique({
      where: {
        uuid: userUuid,
      },
    });

    const returnChat = chat.map((chat) => {
      return {
        ...chat,
        message: chat.message,
        sender_uuid: chat.sender_uuid,
        time_stamp: chat.time_stamp,
      };
    });
    return {
      statusCode: 200,
      body: JSON.stringify({
        returnChat,
        user,
      }),
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
      }),
    };
  }
});
