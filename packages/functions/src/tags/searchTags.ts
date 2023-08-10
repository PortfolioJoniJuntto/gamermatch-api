import stringifyBigInt from "@functions/utils/stringifyBigInt";
import { PrismaClient } from "@prisma/client";
import { ApiHandler, useJsonBody } from "sst/node/api";

const prisma = new PrismaClient();

export const handler = ApiHandler(async (_evt) => {
  const { query } = useJsonBody();

  try {
    const tags = await prisma.tags.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            slug: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      skip: 0,
      take: 5,
    });

    return {
      statusCode: 200,
      body: stringifyBigInt(tags),
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "An error occurred while adding games for user",
      }),
    };
  }
});
