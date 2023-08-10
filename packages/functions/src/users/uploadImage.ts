import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ApiHandler } from "sst/node/api";

const s3client = new S3Client({});

const { IMAGES_BUCKET_NAME } = process.env;

export const handler = ApiHandler(async (_evt) => {
  const { sub } = _evt.requestContext?.authorizer?.jwt?.claims;

  try {
    const command = new PutObjectCommand({
      Bucket: IMAGES_BUCKET_NAME,
      Key: `uploads/profile/${sub}`,
      Metadata: {
        uuid: sub,
      },
    });

    const url = await getSignedUrl(s3client, command, { expiresIn: 60 });

    return {
      statusCode: 200,
      body: JSON.stringify({ url }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
    };
  }
});
