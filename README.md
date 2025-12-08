# Trello Clone - Backend

A RESTful API backend for the Trello Clone task management application. Built with Express.js, TypeScript, and PostgreSQL, this server provides authentication, board management, and real-time data persistence.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Zod
- **Password Security**: bcryptjs
- **Testing**: Jest
- **Code Quality**: ESLint, TypeScript


## Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd Trello-clone-BE
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
# Create .env file
DATABASE_URL=postgresql://username:password@localhost:5432/trello_clone
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3000
NODE_ENV=development
```

4. Run database migrations:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

6. Server will be running at [http://localhost:3000](http://localhost:3000)

## API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/change-password` - Change password (protected)

### Boards

- `GET /api/boards` - Get all user boards (protected)
- `POST /api/boards` - Create new board (protected)
- `GET /api/boards/:id` - Get board by ID (protected)
- `GET /api/boards/:id/full` - Get board with lists and cards (protected)
- `PUT /api/boards/:id` - Update board (protected)
- `DELETE /api/boards/:id` - Delete board (protected)

### Lists

- `GET /api/lists/board/:boardId` - Get lists by board (protected)
- `POST /api/lists` - Create new list (protected)
- `GET /api/lists/:id` - Get list by ID (protected)
- `PUT /api/lists/:id` - Update list (protected)
- `DELETE /api/lists/:id` - Delete list (protected)

### Cards

- `GET /api/cards/list/:listId` - Get cards by list (protected)
- `POST /api/cards` - Create new card (protected)
- `GET /api/cards/:id` - Get card by ID (protected)
- `PUT /api/cards/:id` - Update card (protected)
- `DELETE /api/cards/:id` - Delete card (protected)


## Testing

Run tests:
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
