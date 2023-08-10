import { PrismaClient } from "@prisma/client";
import { ApiHandler } from "sst/node/api";

const prisma = new PrismaClient();

export const handler = ApiHandler(async (_evt) => {
  const { sub } = _evt.requestContext?.authorizer?.jwt?.claims;
  try {
    const matches = await prisma.connections.findMany({
      where: {
        OR: [{ user_uuid1: sub }, { user_uuid2: sub }],
      },
    });

    const users = await prisma.users.findMany({
      where: {
        OR: [
          { uuid: { in: matches.map((match) => match.user_uuid1) } },
          { uuid: { in: matches.map((match) => match.user_uuid2) } },
        ],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ users, matches }),
    };
  } catch (error) {
    console.error("Error retrieving matches:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Error retrieving matches",
      }),
    };
  }
});
