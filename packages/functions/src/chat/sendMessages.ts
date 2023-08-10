import sendPushNotificationsAsyns from "@functions/utils/sendNotification";
import { PrismaClient } from "@prisma/client";
import { ApiHandler, useJsonBody } from "sst/node/api";

const prisma = new PrismaClient();

export const handler = ApiHandler(async (_evt) => {
  try {
    const {
      user_uuid1,
      user_uuid2,
      message,
      sender_uuid,
      connection_id,
      push_token,
    } = useJsonBody();

    const match = await prisma.connections.findFirst({
      where: {
        uuid: connection_id,
      },
    });

    if (!match) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Match does not exist",
        }),
      };
    }

    const chat = await prisma.chats.create({
      data: {
        user_uuid1,
        user_uuid2,
        message,
        sender_uuid,
        connection_uuid: connection_id,
      },
    });

    const title = "New message";
    const body = message;

    const data = {
      type: "chat",
      connection_id,
    };

    await sendPushNotificationsAsyns(push_token, title, body, data);

    return {
      statusCode: 200,
      body: JSON.stringify(chat),
    };
  } catch (error) {
    console.error(error);
  }
});
