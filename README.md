# Iwona Safari Backend

A professional-grade Node.js backend API built with Express, Prisma, and PostgreSQL.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT
- **Validation:** Joi
- **Logging:** Winston + Morgan

## Project Structure

```
├── prisma/
│   └── schema.prisma          # Prisma schema file
├── src/
│   ├── config/                # App configuration
│   │   ├── index.js           # Environment config
│   │   └── database.js        # Prisma client
│   ├── controllers/           # Route controllers
│   │   ├── auth.controller.js
│   │   └── user.controller.js
│   ├── middlewares/           # Express middlewares
│   │   ├── auth.js            # Authentication & authorization
│   │   ├── errorHandler.js    # Error handling
│   │   └── validate.js        # Request validation
│   ├── routes/                # API routes
│   │   ├── index.js
│   │   ├── auth.routes.js
│   │   └── user.routes.js
│   ├── services/              # Business logic
│   │   ├── auth.service.js
│   │   └── user.service.js
│   ├── utils/                 # Utility functions
│   │   ├── apiError.js        # Custom error class
│   │   ├── apiResponse.js     # Response helper
│   │   ├── asyncHandler.js    # Async wrapper
│   │   └── logger.js          # Winston logger
│   ├── validations/           # Joi schemas
│   │   ├── auth.validation.js
│   │   └── user.validation.js
│   ├── app.js                 # Express app setup
│   └── index.js               # Server entry point
├── tests/                     # Test files
├── .env                       # Environment variables (do not commit)
├── .env.example               # Example env file
├── .eslintrc.json             # ESLint config
├── .gitignore                 # Git ignore file
├── .prettierrc                # Prettier config
├── package.json               # Dependencies
└── README.md                  # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

5. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

6. Start development server:
   ```bash
   npm run dev
   ```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with hot reload |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm test` | Run tests |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio |

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/refresh-token` - Refresh access token

### Users
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update current user
- `DELETE /api/v1/users/me` - Delete current user
- `GET /api/v1/users` - Get all users (Admin)
- `GET /api/v1/users/:id` - Get user by ID (Admin)
- `DELETE /api/v1/users/:id` - Delete user (Admin)

### Health Check
- `GET /health` - Server health check

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 5000 |
| `DATABASE_URL` | PostgreSQL connection URL | - |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | JWT expiration | 7d |
| `CORS_ORIGIN` | CORS allowed origin | http://localhost:3000 |

## License

ISC
