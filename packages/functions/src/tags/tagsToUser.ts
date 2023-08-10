import { PrismaClient } from "@prisma/client";
import { ApiHandler, useJsonBody } from "sst/node/api";

const prisma = new PrismaClient();

export const handler = ApiHandler(async (_evt) => {
  const { sub } = _evt.requestContext?.authorizer?.jwt?.claims;
  const { tags: tagsToAdd } = useJsonBody();

  try {
    // Check if tags already exist for user
    const usertags = await prisma.user_interests.findMany({
      where: {
        user_uuid: sub,
        tag_id: {
          in: tagsToAdd,
        },
      },
    });
    // Filter out tags that already exist for user
    const tagsToAddFiltered = tagsToAdd.filter(
      (tagId) => !usertags.find((userTag) => userTag.tag_id === tagId)
    );

    const addtagsToPromise = tagsToAddFiltered.map((tagId) =>
      prisma.user_interests.create({
        data: {
          user_uuid: sub,
          tag_id: tagId,
        },
      })
    );
    await Promise.all(addtagsToPromise);

    return {
      statusCode: 200,
      body: `Successfully added tags for user ${sub}`,
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: "An error occurred while adding tags for user",
    };
  }
});
