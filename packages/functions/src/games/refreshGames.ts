import {
  game_genres,
  game_platforms,
  game_tags,
  games,
  genres,
  platforms,
  PrismaClient,
} from "@prisma/client";

import { v4 as uuidv4 } from "uuid";
import dayjs from "dayjs";
import { ApiHandler, useJsonBody } from "sst/node/api";

const prisma = new PrismaClient();
interface TwitchToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}
interface TwitchTopGamesResult {
  data: TwitchGame[];
  pagination: {
    cursor: string;
  };
}
interface TwitchGame {
  id: string;
  name: string;
  box_art_url: string;
  igdb_id: string;
}
const { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET } = process.env;
let twitchToken: TwitchToken;
const fetchTwitchTopGames = async (
  cursor: string
): Promise<TwitchTopGamesResult> => {
  const response = await fetch(
    `https://api.twitch.tv/helix/games/top?first=100&after=${cursor}`,
    {
      method: "GET",
      headers: {
        "Client-ID": TWITCH_CLIENT_ID,
        Authorization: `Bearer ${twitchToken.access_token}`,
      },
    }
  );

  const data = await response.json();
  return data;
};

export const handler = ApiHandler(async (_evt) => {
  try {
    twitchToken = await (
      await fetch(
        `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
        {
          method: "POST",
        }
      )
    ).json();

    let top = useJsonBody().top || 100;

    let twitchGames: TwitchGame[] = [];
    let cursor = "";
    for (let i = 0; i < top; i += 100) {
      const response = await fetchTwitchTopGames(cursor);
      cursor = response.pagination?.cursor;
      twitchGames = [...twitchGames, ...response.data];
    }
    twitchGames = twitchGames.filter((tg) => tg.igdb_id);

    let apiGames = await (
      await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: {
          "Client-ID": TWITCH_CLIENT_ID,
          Authorization: `Bearer ${twitchToken.access_token}`,
          "Content-Type": "text/plain",
        },
        body: `
          fields aggregated_rating,aggregated_rating_count,category,checksum,collection,cover.image_id,created_at,first_release_date,game_modes.name,game_modes.slug,genres.name,genres.slug,multiplayer_modes,name,platforms.name,platforms.slug,rating,rating_count,release_dates.date,release_dates.human,release_dates.platform.name,screenshots.image_id,slug,summary,updated_at,url,videos.name,videos.video_id;
          limit 500;
          where id = (${twitchGames.map((tg) => tg.igdb_id).join(",")});
        `,
      })
    ).json();

    let dbGenres = await prisma.genres.findMany();
    let dbPlatforms = await prisma.platforms.findMany();

    const igdbPlatforms = new Map<string, platforms>();
    const igdbGames = new Map<string, genres>();

    for (let rgame of apiGames) {
      rgame.platforms?.forEach((p) => {
        if (!igdbPlatforms.get(p.name))
          igdbPlatforms.set(p.name, {
            name: p.name,
            slug: p.slug,
          } as platforms);
      });
      rgame.genres?.forEach((g) => {
        if (!igdbGames.get(g.name))
          igdbGames.set(g.name, { name: g.name, slug: g.slug } as genres);
      });
    }

    for (let value of igdbPlatforms.values()) {
      let dbPlatform = dbPlatforms.find((t) => t.name === value.name);
      if (!dbPlatform) dbPlatform = {} as platforms;
      dbPlatform.name = value.name;
      dbPlatform.image = value.image;
      dbPlatform.slug = value.slug;
      if (dbPlatform.id) {
        await prisma.platforms.update({
          where: { id: dbPlatform.id },
          data: dbPlatform,
        });
      } else {
        await prisma.platforms.create({
          data: dbPlatform,
        });
      }
    }

    for (let value of igdbGames.values()) {
      let dbGenre = dbGenres.find((t) => t.name === value.name);
      if (!dbGenre) dbGenre = {} as genres;
      dbGenre.name = value.name;
      dbGenre.slug = value.slug;
      if (dbGenre.id) {
        await prisma.genres.update({
          where: { id: dbGenre.id },
          data: dbGenre,
        });
      } else {
        await prisma.genres.create({
          data: dbGenre,
        });
      }
    }

    dbGenres = await prisma.genres.findMany();
    dbPlatforms = await prisma.platforms.findMany();

    const dbGenresBySlug = new Map<string, genres>();
    dbGenres.map((g) => dbGenresBySlug.set(g.slug, g));

    const dbPlatformsBySlug = new Map<string, platforms>();
    dbPlatforms.map((g) => dbPlatformsBySlug.set(g.slug, g));

    const dbGames = await prisma.games.findMany({
      include: {
        game_genres: true,
        game_platforms: true,
      },
    });
    for (let rgame of apiGames) {
      let dbGame = dbGames.find(
        (g) => g.igdb_id.toString() === rgame.id.toString()
      );

      if (!dbGame)
        dbGame = {} as games & {
          game_tags: game_tags[];
          game_platforms: game_platforms[];
          game_genres: game_genres[];
        };

      rgame.release_dates?.sort(
        (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix()
      );

      const topRanking = twitchGames.findIndex(
        (tg) => parseInt(tg.igdb_id) === rgame.id
      );

      dbGame.igdb_id = BigInt(rgame.id);
      dbGame.name = rgame.name;
      dbGame.cover_image = rgame.cover?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${rgame.cover?.image_id}.jpg`
        : null;
      dbGame.background_image =
        rgame.screenshots?.length >= 1
          ? `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${rgame.screenshots?.[0]?.image_id}.jpg`
          : null;
      dbGame.background_image2 =
        rgame.screenshots?.length >= 2
          ? `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${rgame.screenshots?.[1]?.image_id}.jpg`
          : null;
      dbGame.released = rgame.release_dates?.[0]
        ? dayjs.unix(rgame.release_dates[0].date).toDate()
        : null;
      dbGame.updated_at = dayjs().toDate();
      dbGame.top = topRanking > -1 ? topRanking + 1 : 999;

      const genres = rgame.genres?.map((g) => dbGenresBySlug.get(g.slug)) || [];
      const platforms =
        rgame.platforms?.map((g) => dbPlatformsBySlug.get(g.slug)) || [];

      if (!dbGame.uuid) {
        dbGame.uuid = uuidv4();
        await prisma.games.create({
          data: {
            ...dbGame,
            game_genres: {
              create: genres?.map((g) => ({
                genres: { connect: { id: g.id } },
              })),
            },
            game_platforms: {
              create: platforms?.map((g) => ({
                platforms: { connect: { id: g.id } },
              })),
            },
          },
        });
      } else {
        const genresToDelete = dbGame.game_genres.filter(
          (g) => genres.findIndex((p) => p.id === g.genre_id) === -1
        );
        const platformsToDelete = dbGame.game_platforms.filter(
          (g) => platforms.findIndex((p) => p.id === g.platform_id) === -1
        );

        await prisma.games.update({
          where: { uuid: dbGame.uuid },
          data: {
            ...dbGame,
            game_genres: {
              create: genres
                ?.map((g) => ({ genres: { connect: { id: g.id } } }))
                .filter(
                  (g) =>
                    dbGame.game_genres.findIndex(
                      (gg) => gg.genre_id == g.genres.connect.id
                    ) === -1
                ),
              deleteMany: genresToDelete.map((g) => ({
                genre_id: g.genre_id,
              })),
            },
            game_platforms: {
              create: platforms
                ?.map((g) => ({ platforms: { connect: { id: g.id } } }))
                .filter(
                  (g) =>
                    dbGame.game_platforms.findIndex(
                      (gg) => gg.platform_id == g.platforms.connect.id
                    ) === -1
                ),
              deleteMany: platformsToDelete.map((g) => ({
                platform_id: g.platform_id,
              })),
            },
          },
        });
      }
    }

    return {
      statusCode: 200,
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      statusCode: 500,
    };
  }
});
