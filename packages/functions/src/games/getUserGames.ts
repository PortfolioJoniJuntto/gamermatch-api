import stringifyBigInt from "@functions/utils/stringifyBigInt";
import { PrismaClient } from "@prisma/client";
import { ApiHandler } from "sst/node/api";

const prisma = new PrismaClient();

export const handler = ApiHandler(async (_evt) => {
  const { sub } = _evt.requestContext?.authorizer?.jwt?.claims;

  try {
    const userGames = await prisma.user_games.findMany({
      where: {
        user_uuid: sub,
      },
    });

    const gamesDetails = await Promise.all(
      userGames.map((userGame) =>
        prisma.games.findUnique({
          where: {
            uuid: userGame.game_uuid,
          },
        })
      )
    );

    return {
      statusCode: 200,
      body: stringifyBigInt(gamesDetails),
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
