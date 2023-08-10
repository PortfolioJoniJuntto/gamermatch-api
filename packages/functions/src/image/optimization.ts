import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
console.log("Loading function");
import sharp from "sharp";
console.log("Sun mutsis")
import { ApiHandler } from "sst/node/api";

const prisma = new PrismaClient();

const s3Client = new S3Client({});

export const handler = ApiHandler(async (_evt) => {
  const event = _evt as any;
  console.log(event)

  for (const record of event.Records) {
    try {
      const bucket = record.s3.bucket.name;
      const srcKey = decodeURIComponent(
        record.s3.object.key.replace(/\+/g, " ")
      );

      // Download the image from S3
      const origImg = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: srcKey,
        })
      );

      const imgMetadata = await s3Client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: srcKey,
        })
      );

      const userId = imgMetadata.Metadata.uuid;

      // Resize and optimize the image using Sharp
      const resizedImg = await sharp(await origImg.Body.transformToByteArray())
        .resize({
          width: 512,
          fit: "contain",
        })
        .toFormat("webp")
        .toBuffer();

      console.log(resizedImg);

      // Upload the optimized image to S3
      const dstKey = `profiles/${userId}`;

      const response = await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: dstKey,
          Body: resizedImg,
          ContentType: "image/webp",
        })
      );
      console.log(response)
      console.log("Image uploaded to S3:", dstKey);
      console.log("Updating user image in DB for user:", userId);


      const user = await prisma.users.update({
        where: {
          uuid: userId,
        },
        data: {
          image: dstKey,
        },
      });
      console.log("User image updated:", user);


      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: srcKey,
        })
      );
    } catch (err) {
      console.error("Error:", err);
    }
  }
});
