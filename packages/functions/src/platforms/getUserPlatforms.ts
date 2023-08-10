import stringifyBigInt from "@functions/utils/stringifyBigInt";
import { PrismaClient } from "@prisma/client";
import { ApiHandler } from "sst/node/api";

const prisma = new PrismaClient();

export const handler = ApiHandler(async (_evt) => {
  const { sub } = _evt.requestContext?.authorizer?.jwt?.claims;

  try {
    const userPlatforms = await prisma.user_platforms.findMany({
      where: {
        user_uuid: sub,
      },
      include: {
        platforms: true,
      },
    });

    // If you only want the platform details, you can map to get those
    const platformsDetails = userPlatforms.map(
      (userPlatform) => userPlatform.platforms
    );

    return {
      statusCode: 200,
      body: stringifyBigInt(platformsDetails),
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "An error occurred while fetching platforms for user",
      }),
    };
  }
});
