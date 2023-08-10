import {
  StackContext,
  Api,
  Cognito,
  Function,
  Cron,
  Bucket,
} from "sst/constructs";
import fs from "fs-extra";

import { join } from "path";
import { Code, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { RuleTargetInput } from "aws-cdk-lib/aws-events";

function preparePrismaLayerFiles() {
  const layerPath = "./layers/prisma";
  fs.rmSync(layerPath, { force: true, recursive: true });
  fs.mkdirSync(layerPath, { recursive: true });
  const files = [
    "node_modules/.prisma",
    "node_modules/@prisma/client",
    "node_modules/prisma/build",
  ];
  for (const file of files) {
    const path = join(layerPath, "nodejs", file);
    fs.copySync(file, path, {
      filter: (src: string) => !src.endsWith("so.node") || src.includes("rhel"),
    });
  }
}

function prepareSharpLayerFiles() {
  const layerPath = "./layers/sharp";
  fs.rmSync(layerPath, { force: true, recursive: true });
  fs.mkdirSync(layerPath, { recursive: true });
  const files = ["node_modules/sharp"];
  const path = join(layerPath, "nodejs", files[0]);
  fs.copySync(files[0], path, {
    filter: (src: string) => !src.endsWith("so.node") || src.includes("rhel"),
  });
}


export function API({ stack }: StackContext) {
  preparePrismaLayerFiles();
  prepareSharpLayerFiles();

  const SharpLayer = new LayerVersion(stack, "SharpLayer", {
    code: Code.fromAsset("./layers/sharp"),
    compatibleRuntimes: [Runtime.NODEJS_18_X, Runtime.NODEJS_16_X],
  });

  const PrismaLayer = new LayerVersion(stack, "PrismaLayer", {
    code: Code.fromAsset("./layers/prisma"),
    compatibleRuntimes: [Runtime.NODEJS_18_X, Runtime.NODEJS_16_X],
  });

  const auth = new Cognito(stack, "Auth", {
    login: ["email"],
    cdk: {
      userPool: {
        passwordPolicy: {
          minLength: 8,
          requireLowercase: false,
          requireUppercase: false,
          requireDigits: false,
          requireSymbols: false,
        },
      },
      userPoolClient: {
        authFlows: {
          userPassword: true,
          adminUserPassword: true,
        },
      },
    },
  });

  const s3bucket = new Bucket(stack, "images", {
    notifications: {
      optimizeImage: {
        function:{
           environment: {
          DATABASE_URL: process.env.DATABASE_URL || "",
        },
          handler: "packages/functions/src/image/optimization.handler",
          nodejs: {
            esbuild: {
            external: ["@prisma/client", ".prisma"],
          },
    install: ["sharp"],
  },
          layers: [SharpLayer, PrismaLayer],
        },
        events: ["object_created"],
        filters: [
          {
            prefix: "uploads/",
          },
        ],
      },
    },
  });

  const api = new Api(stack, "api", {
    authorizers: {
      jwt: {
        type: "user_pool",
        userPool: {
          id: auth.userPoolId,
          clientIds: [auth.userPoolClientId],
        },
      },
    },
    defaults: {
      function: {
        runtime: "nodejs18.x",
        environment: {
          IMAGES_BUCKET_NAME: s3bucket.bucketName,
          USER_POOL_ID: auth.userPoolId,
          USER_POOL_CLIENT_ID: auth.userPoolClientId,
          // Custom environment variables below
          DATABASE_URL: process.env.DATABASE_URL || "",
          TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID || "",
          TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET || "",
        },
        nodejs: {
          esbuild: {
            external: ["@prisma/client", ".prisma"],
          },
        },
        layers: [PrismaLayer],
        bind: [s3bucket],
      },
      authorizer: "jwt",
    },
    routes: {
      "POST /auth/login": {
        function: "packages/functions/src/auth/login.handler",
        authorizer: "none",
      },
      "POST /auth/register": {
        function: "packages/functions/src/auth/register.handler",
        authorizer: "none",
      },
      "POST /auth/refresh": {
        function: "packages/functions/src/auth/refresh.handler",
        authorizer: "none",
      },
      "POST /auth/code": {
        function: "packages/functions/src/invite/checkInviteCode.handler",
        authorizer: "none",
      },
      "POST /chat": "packages/functions/src/chat/sendMessages.handler",
      "GET /chat/{connectionId}":
        "packages/functions/src/chat/getMessages.handler",

      "POST /connections/like":
        "packages/functions/src/connections/like.handler",
      "POST /connections/dislike":
        "packages/functions/src/connections/dislike.handler",
      "GET /connections":
        "packages/functions/src/connections/getConnections.handler",

      "POST /games": "packages/functions/src/games/searchGames.handler",
      "GET /games/top": "packages/functions/src/games/getTopGames.handler",
      "GET /games/user": "packages/functions/src/games/getUserGames.handler",
      "POST /games/user": "packages/functions/src/games/gamesToUser.handler",

      "GET /platforms":
        "packages/functions/src/platforms/getAllPlatforms.handler",
      "POST /platforms":
        "packages/functions/src/platforms/platformsToUser.handler",
      "GET /platforms/user":
        "packages/functions/src/platforms/getUserPlatforms.handler",

      "GET /tags": "packages/functions/src/tags/getAllTags.handler",
      "POST /tags": "packages/functions/src/tags/searchTags.handler",
      "POST /tags/user": "packages/functions/src/tags/tagsToUser.handler",
      "GET /tags/user": "packages/functions/src/tags/getUserTags.handler",

      "GET /users": "packages/functions/src/users/getUsers.handler",
      "GET /users/me": "packages/functions/src/users/getOwnData.handler",
      "PATCH /users/me": "packages/functions/src/users/updateOwnData.handler",
      "GET /users/swipeables":
        "packages/functions/src/users/getSwipeables.handler",
      "GET /users/profile/image":
        "packages/functions/src/users/uploadImage.handler",
    },
  });

  const refreshGames = new Function(stack, "refreshGames", {
    handler: "packages/functions/src/games/refreshGames.handler",
    timeout: 900,
  });

  new Cron(stack, "refreshGamesCronDaily", {
    schedule: "rate(1 day)",
    job: {
      function: refreshGames,
      cdk: {
        target: {
          event: RuleTargetInput.fromObject({
            top: 100,
          }),
        },
      },
    },
  });

  new Cron(stack, "refreshGamesCronBiWeekly", {
    schedule: "rate(14 days)",
    job: {
      function: refreshGames,
      cdk: {
        target: {
          event: RuleTargetInput.fromObject({
            top: 500,
          }),
        },
      },
    },
  });

  api.attachPermissionsToRoute("POST /auth/register", [
    "cognito-idp:AdminCreateUser",
    "cognito-idp:AdminSetUserPassword",
    "cognito-idp:AdminInitiateAuth",
  ]);

  api.attachPermissionsToRoute("POST /auth/login", [
    "cognito-idp:AdminInitiateAuth",
  ]);

  api.attachPermissionsToRoute("GET /users/profile/image", [
    "s3:PutObject",
    "s3:GetObject",
  ]);

  s3bucket.attachPermissions([
    "s3:PutObject",
    "s3:GetObject",
    "s3:DeleteObject",
    "s3:ListBucket",
    "s3:HeadObject",
    "AWSLambdaBasicExecutionRole",
  ]);

  s3bucket.attachPermissionsToNotification("optimizeImage", [
    "s3:GetObject",
    "s3:PutObject",
    "s3:DeleteObject",
    "s3:ListBucket",
    "s3:HeadObject",
    "lambda:InvokeFunction",
    "AWSLambdaBasicExecutionRole",
  ]);

  stack.addOutputs({
    ApiEndpoint: api.url,
    UserPoolId: auth.userPoolId,
    UserPoolClientId: auth.userPoolClientId,
  });
}
