import { PrismaClient } from "@prisma/client";
import { ApiHandler, useJsonBody } from "sst/node/api";

const prisma = new PrismaClient();

export const handler = ApiHandler(async (_evt) => {
  const { sub } = _evt.requestContext?.authorizer?.jwt?.claims;
  const { likeUuid } = useJsonBody() as { likeUuid: string };
  try {
    // Get all connections involving the liker
    const connections = await prisma.connections.findMany({
      where: {
        OR: [{ user_uuid1: sub }, { user_uuid2: sub }],
      },
    });

    // Check if a connection already exists with the liked user
    const connectionExists = connections.some(
      (connection) =>
        connection.user_uuid1 === likeUuid || connection.user_uuid2 === likeUuid
    );

    if (connectionExists) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Connection already exists.",
        }),
      };
    } else {
      await prisma.likes.create({
        data: {
          user_uuid: sub,
          liked_user_uuid: likeUuid,
        },
      });

      // Check if the liked person also liked the user to create a new connection
      const likedYouBack = await prisma.likes.findUnique({
        where: {
          user_uuid_liked_user_uuid: {
            user_uuid: likeUuid,
            liked_user_uuid: sub,
          },
        },
      });

      if (likedYouBack) {
        await prisma.connections.create({
          data: {
            user_uuid1: sub,
            user_uuid2: likeUuid,
          },
        });
        const matchedUser = await prisma.users.findUnique({
          where: {
            uuid: likeUuid,
          },
        });
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "New match.",
            matchedUser: matchedUser,
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Like registered successfully." }),
      };
    }
  } catch (error) {
    console.error("Error liking user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "An error occurred." }),
    };
  }
});
