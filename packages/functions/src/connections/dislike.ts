import { PrismaClient } from "@prisma/client";
import { ApiHandler, useJsonBody } from "sst/node/api";

const prisma = new PrismaClient();

export const handler = ApiHandler(async (_evt) => {
  const { sub } = _evt.requestContext?.authorizer?.jwt?.claims;
  const { dislikeUuid } = useJsonBody() as { dislikeUuid: string };

  try {
    // Get all connections involving the disliker
    const connections = await prisma.connections.findMany({
      where: {
        OR: [{ user_uuid1: sub }, { user_uuid2: sub }],
      },
    });

    // Check if a connection already exists with the disliked user
    const connectionExists = connections.some(
      (connection) =>
        connection.user_uuid1 === dislikeUuid ||
        connection.user_uuid2 === dislikeUuid
    );

    if (connectionExists) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Connection already exists." }),
      };
    } else {
      await prisma.dislikes.create({
        data: {
          user_uuid: sub,
          liked_user_uuid: dislikeUuid,
        },
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Dislike registered successfully." }),
      };
    }
  } catch (error) {
    console.error("Error disliking user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "An error occurred." }),
    };
  }
});
