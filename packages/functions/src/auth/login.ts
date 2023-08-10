import {
  AdminInitiateAuthCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import jwt from "jsonwebtoken";
import { PrismaClient } from "prisma/prisma-client";
import { ApiHandler, useJsonBody } from "sst/node/api";

const { USER_POOL_ID, USER_POOL_CLIENT_ID } = process.env;
const prisma = new PrismaClient();

const cognito = new CognitoIdentityProviderClient({});

interface LoginBody {
  email: string;
  password: string;
  push_token: string;
}

export const handler = ApiHandler(async (_evt) => {
  try {
    const { email, password, push_token } = useJsonBody() as LoginBody;
    const push_notifications = true;
    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Please fill in all fields",
        }),
      };
    }

    const { AuthenticationResult } = await cognito.send(
      new AdminInitiateAuthCommand({
        UserPoolId: USER_POOL_ID,
        ClientId: USER_POOL_CLIENT_ID,
        AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
        AuthParameters: { USERNAME: email, PASSWORD: password },
      })
    );
    const decoded = jwt.decode(AuthenticationResult.IdToken);
    const sub = decoded.sub.toString();

    const updateData = {
      ...(push_token && { push_token: push_token }),
      ...(push_notifications !== undefined && { push_notifications }),
    };
    const user = await prisma.users.update({
      where: {
        uuid: sub,
      },
      data: updateData,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        accessToken: AuthenticationResult.AccessToken,
        refreshToken: AuthenticationResult.RefreshToken,
        expiresIn: AuthenticationResult.ExpiresIn,
        user,
      }),
    };
  } catch (error) {
    console.error("error: ", error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Invalid email or password",
      }),
    };
  }
});
