import stringifyBigInt from "@functions/utils/stringifyBigInt";
import { PrismaClient, Prisma } from "@prisma/client";
import { ApiHandler } from "sst/node/api";

const prisma = new PrismaClient();

export const handler = ApiHandler(async (_evt) => {
  try {
    const platforms = await prisma.platforms.findMany();

    return {
      statusCode: 200,
      body: stringifyBigInt(platforms),
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
    };
  }
});
