import { Expo } from "expo-server-sdk";
let expo = new Expo();

const sendPushNotificationsAsyns = async (
  token: string,
  title: string,
  body: string,
  data: any
) => {
  let messages = [];

  if (!Expo.isExpoPushToken(token)) {
    console.error(`Push token ${token} is not a valid Expo push token`);
    return;
  }

  messages.push({
    to: token,
    sound: "default",
    body: title,
    data: { body, data },
  });

  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];

  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log(ticketChunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error(error);
    }
  }
};

export default sendPushNotificationsAsyns;
