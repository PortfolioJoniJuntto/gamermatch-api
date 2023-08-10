# gamermatch Backend

## Introduction

The backend of gamermatch ensures a seamless experience for users of the mobile application. Powered by AWS technologies, it provides robust and scalable infrastructure for matchmaking, chat functionalities, and user management.

## Tech Stack

- **AWS:** Cloud services provider.
- **Cognito:** User authentication and authorization.
- **Lambdas:** Serverless functions for business logic.
- **S3:** Storage for application assets.
- **sst.dev:** Serverless Stack for fast AWS deployments.
- **PostgreSQL:** Primary database for storing user and game-related data.
- **Prisma:** Modern ORM for handling database operations.

## Features

- **User Authentication:** With Cognito, we can register, login, and manage users accounts securely.
- **Serverless Functions:** Lambdas handle various application functionalities without the need for managing servers.
- **Asset Storage:** S3 used to store user's profile images
- **Database Management:** PostgreSQL with Prisma offers efficient data storage and retrieval solutions.

## Setup and Installation

Ensure you have AWS CLI, sst.dev, and Prisma CLI set up on your machine. Then follow these steps:

1. **Clone the Repository:**

   \```bash
   git clone [repository-link]
   \```

2. **Navigate to Backend Directory:**

   \```bash
   cd gamermatch-backend
   \```

3. **Install Dependencies:**

   \```bash
   npm i
   \```

4. **Setup Environment Variables:**

   - Duplicate `env.example` and rename to `.env`
   - Fill in the required variables.

5. **Deploy with SST:**

   \```bash
   npx sst deploy
   \```

6. **Run Migrations with Prisma:**

   \```bash
   npx prisma migrate dev
   \```

Note: Make sure you have the necessary permissions on AWS to perform deployments and create resources.

## Development

While developing:

\```bash
npm run dev
\```

This will start the local development environment.

## Support

Encounter a hiccup? Don't hesitate to open an issue, and I'll address it some day!

## License

Respect the hard work behind this! Do not duplicate or redistribute, that would be lame

---

gamermatch Backend: Powering your game connections! 💻🚀
