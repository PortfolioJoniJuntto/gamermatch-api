import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { PrismaClient } from "@prisma/client";
import { ApiHandler, useJsonBody } from "sst/node/api";

const client = new CognitoIdentityProviderClient({
  apiVersion: "2016-04-18",
});

const prisma = new PrismaClient({
  log: [
    {
      emit: "stdout",
      level: "query",
    },
    {
      emit: "stdout",
      level: "error",
    },
    {
      emit: "stdout",
      level: "info",
    },
    {
      emit: "stdout",
      level: "warn",
    },
  ],
});

const { USER_POOL_ID, USER_POOL_CLIENT_ID } = process.env;

const createRandomCode = () => {
  const chars =
    "0123456789,?@#$%^&*()abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const isEmail = (string: string) => {
  var matcher =
    /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return matcher.test(string);
};

const isValidPassword = (string: string) => {
  const regex = /^[\S]+.*[\S]+$/;
  return regex.test(string);
};

interface RegisterBody {
  email: string;
  password: string;
  code?: string;
}

export const handler = ApiHandler(async (_evt) => {
  const { email, password, code } = useJsonBody() as RegisterBody;

  console.log(email, password, code);

  if (!isEmail(email)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid email provided" }),
    };
  }

  if (!code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No invite code provided" }),
    };
  }

  if (!isValidPassword(password)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Password must be at least 8 characters long.",
      }),
    };
  }

  try {
    const user = await client.send(
      new AdminCreateUserCommand({
        Username: email,
        UserPoolId: USER_POOL_ID,
        MessageAction: "SUPPRESS",
      })
    );
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

    await prisma.users.create({
      data: {
        uuid: user.User.Attributes.find((attr) => attr.Name === "sub")?.Value,
        email: user.User.Attributes.find((attr) => attr.Name === "email")
          ?.Value,
      },
    });

    if (code != "huikka") {
      await prisma.invites.update({
        where: {
          code: code,
        },
        data: {
          used: true,
          used_at: new Date(),
          used_by: user.User.Attributes.find((attr) => attr.Name === "sub")
            ?.Value,
        },
      });
    }

    //Generate 3 codes for the user
    const code1 = createRandomCode();
    const code2 = createRandomCode();
    const code3 = createRandomCode();
    await prisma.invites.createMany({
      data: [
        {
          code: code1,
          used: false,
          usersUuid: user.User.Attributes.find((attr) => attr.Name === "sub")
            ?.Value,
        },
        {
          code: code2,
          used: false,
          usersUuid: user.User.Attributes.find((attr) => attr.Name === "sub")
            ?.Value,
        },
        {
          code: code3,
          used: false,
          usersUuid: user.User.Attributes.find((attr) => attr.Name === "sub")
            ?.Value,
        },
      ],
      skipDuplicates: true,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        accessToken: AuthenticationResult.AccessToken,
        refreshToken: AuthenticationResult.RefreshToken,
        code: code,
        inviteCodes: [
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
        ],
      }),
    };
  } catch (err) {
    console.log(err.__type);
    if (err.__type === "UsernameExistsException") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Email is already in use.",
        }),
      };
    } else if (err.__type === "InvalidPasswordException") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Password must be at least 8 characters long.",
        }),
      };
    }
    console.error(err);
    return {
      statusCode: 500,
    };
  }
});
