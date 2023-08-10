import { PrismaClient } from "@prisma/client";
import { ApiHandler, useJsonBody } from "sst/node/api";

const prisma = new PrismaClient();

export const handler = ApiHandler(async (_evt) => {
  const { sub } = _evt.requestContext?.authorizer?.jwt?.claims;
  const { games: gamesToAdd } = useJsonBody();

  try {
    // Check if games already exist for user
    const userGames = await prisma.user_games.findMany({
      where: {
        user_uuid: sub,
        game_uuid: {
          in: gamesToAdd,
        },
      },
    });
    // Filter out games that already exist for user
    const gamesToAddFiltered = gamesToAdd.filter(
      (gameId) => !userGames.find((userGame) => userGame.game_uuid === gameId)
    );

    const addGamesToPromise = gamesToAddFiltered.map((gameId) =>
      prisma.user_games.create({
        data: {
          user_uuid: sub,
          game_uuid: gameId,
        },
      })
    );
    await Promise.all(addGamesToPromise);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully added games for user ${sub}`,
      }),
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
