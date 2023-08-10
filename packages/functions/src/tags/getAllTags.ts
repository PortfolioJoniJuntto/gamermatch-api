import { PrismaClient } from "@prisma/client";
import { ApiHandler } from "sst/node/api";

const prisma = new PrismaClient();

export const handler = ApiHandler(async (_evt) => {
  try {
    const tags = await prisma.tags.findMany();

    return {
      statusCode: 200,
      body: JSON.stringify(tags),
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
    };
  }
});
