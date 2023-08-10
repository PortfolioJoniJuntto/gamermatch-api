import { PrismaClient } from "@prisma/client";
import { ApiHandler, useJsonBody } from "sst/node/api";

const prisma = new PrismaClient();

export const handler = ApiHandler(async (_evt) => {
  const { sub } = _evt.requestContext?.authorizer?.jwt?.claims;
  const { platforms: platformsToAdd } = useJsonBody();

  try {
    // Add each platform to the user
    const addPlatformsPromises = platformsToAdd.map((platformId) =>
      prisma.user_platforms.create({
        data: {
          user_uuid: sub,
          platform_id: platformId,
        },
      })
    );

    // Wait for all promises to complete
    await Promise.all(addPlatformsPromises);

    return {
      statusCode: 200,
      body: `Successfully added platforms for user ${sub}`,
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: "An error occurred while adding platforms for user",
    };
  }
});
