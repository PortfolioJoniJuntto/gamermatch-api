import { PrismaClient } from "@prisma/client";
import { ApiHandler } from "sst/node/api";

const prisma = new PrismaClient();

export const handler = ApiHandler(async (_evt) => {
  try {
    const games = await prisma.games.findMany({
      where: {
        top: {
          lte: 15,
        },
      },
      orderBy: {
        top: "asc",
      },
    });
    return {
      statusCode: 200,
      body: JSON.stringify(games),
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
    };
  }
});
