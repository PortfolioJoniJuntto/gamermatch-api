import { PrismaClient } from "@prisma/client";
import { ApiHandler } from "sst/node/api";

const prisma = new PrismaClient();

export const handler = ApiHandler(async (_evt) => {
  try {
    const users = await prisma.users.findMany();

    return {
      statusCode: 200,
      body: JSON.stringify(users),
    };
  } catch (error) {
    console.error("Error retrieving users:", error);

    return {
      statusCode: 500,
    };
  }
});
