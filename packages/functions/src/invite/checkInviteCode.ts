import { PrismaClient } from "@prisma/client";
import { ApiHandler, useJsonBody } from "sst/node/api";

const prisma = new PrismaClient();

export const handler = ApiHandler(async (_evt) => {
  try {
    const { code } = useJsonBody();

    if (code === "huikka") {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Invite code accepted",
        }),
      };
    }

    const invite = await prisma.invites.findFirst({
      where: {
        code: code,
      },
    });

    if (invite?.used)
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Invite code already used",
        }),
      };

    if (!invite) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Invite code not found",
        }),
      };
    }

    await prisma.invites.update({
      where: {
        code: code,
      },
      data: {
        used: true,
        used_at: new Date(),
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Invite code accepted",
      }),
    };
  } catch (error) {
    console.error("Error creating codes:", error);
    return {
      statusCode: 500,
    };
  }
});
