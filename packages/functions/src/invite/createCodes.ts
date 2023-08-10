import { PrismaClient, Prisma } from "@prisma/client";
import { ApiHandler } from "sst/node/api";

const prisma = new PrismaClient();

const createRandomCode = () => {
  const chars =
    "0123456789,?@#$%^&*()abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

export const handler = ApiHandler(async (_evt) => {
  try {
    const { sub } = _evt.requestContext?.authorizer?.jwt?.claims;

    const invites = await prisma.invites.findMany({
      where: {
        usersUuid: sub,
      },
    });
    if (invites.length > 0) {
      const unusedInvites = invites.filter((invite) => !invite.used);
      if (unusedInvites.length === 0) {
        return {
          statusCode: 418,
          body: JSON.stringify({ error: "No unused invites" }),
        };
      }
      return {
        statusCode: 200,
        body: JSON.stringify(unusedInvites),
      };
    }
    const code1 = createRandomCode();
    const code2 = createRandomCode();
    const code3 = createRandomCode();
    await prisma.invites.createMany({
      data: [
        { code: code1, used: false, usersUuid: sub },
        { code: code2, used: false, usersUuid: sub },
        { code: code3, used: false, usersUuid: sub },
      ],
      skipDuplicates: true,
    });
    return {
      statusCode: 200,
      body: JSON.stringify([
        {
          uuid: code1,
          code: code1,
          used: false,
          created_at: "",
          usersUuid: "",
        },
        {
          uuid: code2,
          code: code2,
          used: false,
          created_at: "",
          usersUuid: "",
        },
        {
          uuid: code3,
          code: code3,
          used: false,
          created_at: "",
          usersUuid: "",
        },
      ]),
    };
  } catch (error) {
    console.error("Error creating codes:", error);
    return {
      statusCode: 500,
    };
  }
});
