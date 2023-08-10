import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "prisma/prisma-client";
import { ApiHandler, useQueryParams } from "sst/node/api";
const client = new CognitoIdentityProviderClient({
  apiVersion: "2016-04-18",
});

const prisma = new PrismaClient();

const { USER_POOL_ID, USER_POOL_CLIENT_ID } = process.env;

const s3 = new S3Client({});

interface DiscordBody {
  access_token: string;
}

const getDiscordUser = async (code: string): Promise<DiscordUser> => {
  const tokenResponseData = await fetch(
    "https://discord.com/api/oauth2/token",
    {
      method: "POST",
      body: new URLSearchParams({
        client_id: "1111008546558062612",
        client_secret: "y7OBspzyzA20x1IVHFMfMaEZzTmcv9Xn",
        code: code,
        grant_type: "authorization_code",
        redirect_uri:
          "https://vvt603h2ke.execute-api.eu-west-1.amazonaws.com/register/discord",
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const tokenResponse = await tokenResponseData.json();

  const userResponse = await fetch("https://discord.com/api/users/@me", {
    headers: {
      authorization: `${tokenResponse.token_type} ${tokenResponse.access_token}`,
    },
  });

  const user = await userResponse.json();

  return user;
};

interface DiscordUser {
  id: string;
  username: string;
  global_name: null | string;
  avatar: string;
  discriminator: string;
  public_flags: number;
  flags: number;
  banner: null | string;
  banner_color: string | null;
  accent_color: number;
  locale: string;
  mfa_enabled: boolean;
  premium_type: number;
  avatar_decoration: null | string;
  email: string;
  verified: boolean;
}

function generateRandomString(): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomString = "";

  for (let i = 0; i < 32; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomString += characters.charAt(randomIndex);
  }

  return randomString;
}

const putUrlToS3 = async (sub: string, url: string) => {
  const data = await fetch(url);

  const arraybuffer = await data.text();

  const buffer = Buffer.from(arraybuffer, "binary");

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.IMAGES_BUCKET_NAME,
      Key: `uploads/profile/${sub}`,
      Body: buffer,
    })
  );
};

export const handler = ApiHandler(async (_evt) => {
  const { code } = useQueryParams();

  try {
    const user = await getDiscordUser(code);

    if (!user.email) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Authentication to Discord failed",
        }),
      };
    }

    const existingUser = await prisma.users.findFirst({
      where: {
        email: user.email,
      },
    });

    if (existingUser) {
      const cognitoAuthUser = await authenticateToCognito(user.email);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/html",
        },
        body: getHTMLPage({
          accessToken: cognitoAuthUser.AccessToken,
          refreshToken: cognitoAuthUser.RefreshToken,
        }),
      };
    }

    const cognitouser = await client.send(
      new AdminCreateUserCommand({
        Username: user.email,
        UserPoolId: USER_POOL_ID,
        MessageAction: "SUPPRESS",
      })
    );

    const cognitoAuthUser = await authenticateToCognito(user.email);

    const sub = cognitouser.User.Attributes.find((attr) => attr.Name === "sub")
      ?.Value;

    await putUrlToS3(
      sub,
      `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`
    );

    await prisma.users.create({
      data: {
        uuid: sub,
        gamertag: user.username,
        email: user.email,
        image: `profiles/${sub}`,
      },
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html",
      },
      body: getHTMLPage({
        accessToken: cognitoAuthUser.AccessToken,
        refreshToken: cognitoAuthUser.RefreshToken,
      }),
    };
  } catch (err) {
    if (err.__type === "UsernameExistsException") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Email is already in use.",
        }),
      };
    }

    console.error(err);

    return {
      statusCode: 500,
    };
  }
});

const authenticateToCognito = async (email: string) => {
  const password = generateRandomString();

  await client.send(
    new AdminSetUserPasswordCommand({
      Username: email,
      Password: password,
      UserPoolId: USER_POOL_ID,
      Permanent: true,
    })
  );

  const { AuthenticationResult } = await client.send(
    new AdminInitiateAuthCommand({
      AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
      ClientId: USER_POOL_CLIENT_ID,
      UserPoolId: USER_POOL_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    })
  );

  return AuthenticationResult;
};

const getHTMLPage = (data: any) => {
  return `<!DOCTYPE html><html><head><script>window.ReactNativeWebView.postMessage('${JSON.stringify(
    data
  )}');</script>

<style>
html, body {
  background-color: #030109;
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.lds-ring {
  display: inline-block;
  position: relative;
  width: 80px;
  height: 80px;
}
.lds-ring div {
  box-sizing: border-box;
  display: block;
  position: absolute;
  width: 64px;
  height: 64px;
  margin: 8px;
  border: 8px solid #fff;
  border-radius: 50%;
  animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  border-color: #fff transparent transparent transparent;
}
.lds-ring div:nth-child(1) {
  animation-delay: -0.45s;
}
.lds-ring div:nth-child(2) {
  animation-delay: -0.3s;
}
.lds-ring div:nth-child(3) {
  animation-delay: -0.15s;
}
@keyframes lds-ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

</style></head><body>
<div class="lds-ring"><div></div><div></div><div></div><div></div></div>

</body></html>`;
};
