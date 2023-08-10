import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { ApiHandler, useJsonBody } from "sst/node/api";

const client = new CognitoIdentityProviderClient({
  apiVersion: "2016-04-18",
});

const { USER_POOL_ID, USER_POOL_CLIENT_ID } = process.env;

interface RefreshTokenBody {
  refreshToken: string;
}

export const handler = ApiHandler(async (_evt) => {
  const { refreshToken } = useJsonBody() as RefreshTokenBody;

  if (!refreshToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "No refresh token provided",
      }),
    };
  }

  try {
    const adminInitAuth = new AdminInitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      UserPoolId: USER_POOL_ID,
      ClientId: USER_POOL_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    const { AuthenticationResult } = await client.send(adminInitAuth);

    return {
      statusCode: 200,
      body: JSON.stringify({
        accessToken: AuthenticationResult.AccessToken,
        refreshToken: AuthenticationResult.RefreshToken,
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
    };
  }
});
