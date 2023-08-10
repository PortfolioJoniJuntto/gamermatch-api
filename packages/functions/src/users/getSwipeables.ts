import stringifyBigInt from "@functions/utils/stringifyBigInt";
import { PrismaClient } from "@prisma/client";
import { ApiHandler } from "sst/node/api";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const prisma = new PrismaClient();
const { IMAGES_BUCKET_NAME } = process.env;
const s3 = new S3Client({});
export const handler = ApiHandler(async (_evt) => {
  const { sub } = _evt.requestContext?.authorizer?.jwt?.claims;
  try {
    const likedUsers = await prisma.likes.findMany({
      where: {
        user_uuid: sub,
      },
    });
    const dislikedUsers = await prisma.dislikes.findMany({
      where: {
        user_uuid: sub,
      },
    });

    const onlyLocal = await prisma.users.findUnique({
      where: {
        uuid: sub,
      },
      select: {
        only_local: true,
      },
    });

    const playStyleCompetitive = await prisma.users.findUnique({
      where: {
        uuid: sub,
      },
      select: {
        competitive: true,
      },
    });

    const likedUserUuids = likedUsers.map((like) => like.liked_user_uuid);
    const dislikedUserUuids = dislikedUsers.map(
      (dislike) => dislike.liked_user_uuid
    );
    const connections = await prisma.connections.findMany({
      where: {
        OR: [{ user_uuid1: sub }, { user_uuid2: sub }],
      },
    });
    const connectionUuids = connections.map((connection) => {
      if (connection.user_uuid1 === sub) {
        return connection.user_uuid2;
      } else {
        return connection.user_uuid1;
      }
    });

    const users = await prisma.users.findMany({
      where: {
        uuid: {
          not: {
            in: [
              ...likedUserUuids,
              ...dislikedUserUuids,
              ...connectionUuids,
              sub,
            ],
          },
        },
      },
    });

    const usersWithTagsGamesAndInterests = await Promise.all(
      users.map(async (user) => {
        const userTags = await prisma.user_interests.findMany({
          where: {
            user_uuid: user.uuid,
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
            user_uuid: user.uuid,
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
            user_uuid: user.uuid,
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

        return { ...user, tags, games, platforms, image };
      })
    );

    return {
      statusCode: 200,
      body: stringifyBigInt(usersWithTagsGamesAndInterests),
    };
  } catch (error) {
    console.error("Error retrieving users:", error);
    return {
      statusCode: 500,
    };
  }
});
