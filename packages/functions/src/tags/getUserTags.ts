import stringifyBigInt from "@functions/utils/stringifyBigInt";
import { PrismaClient } from "@prisma/client";
import { ApiHandler } from "sst/node/api";

const prisma = new PrismaClient();

export const handler = ApiHandler(async (_evt) => {
  const { sub } = _evt.requestContext?.authorizer?.jwt?.claims;

  try {
    const userTags = await prisma.user_interests.findMany({
      where: {
        user_uuid: sub,
      },
    });

    const tagsDetail = await Promise.all(
      userTags.map((userTag) =>
        prisma.tags.findUnique({
          where: {
            id: userTag.tag_id,
          },
        })
      )
    );
    return {
      statusCode: 200,
      body: stringifyBigInt(tagsDetail),
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "An error occurred while fetching games for user",
      }),
    };
  }
});
