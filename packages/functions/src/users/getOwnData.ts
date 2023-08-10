import { PrismaClient } from "@prisma/client";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ApiHandler } from "sst/node/api";
import stringifyBigInt from "@functions/utils/stringifyBigInt";

const prisma = new PrismaClient();
const { IMAGES_BUCKET_NAME } = process.env;

const s3 = new S3Client({});

export const handler = ApiHandler(async (_evt) => {
  const { sub } = _evt.requestContext?.authorizer?.jwt?.claims;

  try {
    const user = await prisma.users.findUnique({
      include: {
        user_interests: true,
        user_platforms: true,
      },
      where: { uuid: sub },
    });

    console.log(user)

    let image = null;
    if (user?.image) {
      image = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: IMAGES_BUCKET_NAME,
          Key: user?.image,
        }),
        {
          expiresIn: 3600,
        }
      );
    }

    console.log("image", image);

    const userTags = await prisma.user_interests.findMany({
      where: {
        user_uuid: sub,
      },
    });
    const tags = await Promise.all(
      userTags.map((userTag) =>
        prisma.tags.findUnique({
          where: {
            id: userTag.tag_id,
          },
        })
      )
    );

    const userGames = await prisma.user_games.findMany({
      where: {
        user_uuid: sub,
      },
    });
    const games = await Promise.all(
      userGames.map((userGame) =>
        prisma.games.findUnique({
          where: {
            uuid: userGame.game_uuid,
          },
        })
      )
    );

    const userPlatforms = await prisma.user_platforms.findMany({
      where: {
        user_uuid: sub,
      },
    });
    const platforms = await Promise.all(
      userPlatforms.map((userPlatform) =>
        prisma.platforms.findUnique({
          where: {
            id: userPlatform.platform_id,
          },
        })
      )
    );

    const invites = await prisma.invites.findMany({
      where: {
        usersUuid: sub,
        used: false,
      },
    });

    const returnData = { ...user, image, tags, games, platforms, invites };

    return {
      statusCode: 200,
      body: stringifyBigInt(returnData),
    };
  } catch (error) {
    console.error("Error retrieving user:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
});
