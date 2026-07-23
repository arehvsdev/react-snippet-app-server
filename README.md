# React Snippet App Server

This repository contains the backend server for the React Snippet App. It is built with Node.js, Express, MongoDB/Mongoose, JWT-based authentication, and Swagger documentation.

## Features

- User registration, login, and username availability checks
- JWT-protected routes for snippet creation and deletion
- Public snippet listing with optional filtering by user or visibility
- Bookmarking support for authenticated users
- Comments on snippets
- Health check endpoint with database status
- Swagger UI available at /api-docs
- Admin seeding script for creating an initial admin user

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JSON Web Tokens (JWT)
- bcryptjs
- Swagger UI Express
- CORS

## Prerequisites

- Node.js 18+
- MongoDB instance running locally or remotely

## Environment Variables

Create a .env file in the project root with the following values:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/react-snippet-app
JWT_SECRET=your-super-secret-key
```

## Installation

```bash
npm install
```

## Running the Server

Start the server in development mode:

```bash
npm run dev
```

Or run the production-style start command:

```bash
npm start
```

## Available Scripts

```bash
npm run dev        # start the server with nodemon
npm start          # start the server with node
npm run seed:admin # create an initial admin user
```

## API Overview

Base URL:

```text
http://localhost:5000
```

### Health

- GET /health

### Root

- GET /

### Authentication

- GET /api/auth/check-username?username=alex
- POST /api/auth/register
- POST /api/auth/login

### Snippets

- GET /api/snippets
- GET /api/snippets/:id
- POST /api/snippets
- DELETE /api/snippets/:id
- POST /api/snippets/:id/bookmarks
- GET /api/snippets/my/bookmarks
- GET /api/snippets/:id/comments
- POST /api/snippets/:id/comments

### Swagger Docs

- GET /api-docs

## Example Request Bodies

### Register user

```json
{
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123",
  "role": "developer",
  "phonenumber": "1234567890"
}
```

### Login user

```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### Create snippet

```json
{
  "title": "Reverse a String",
  "description": "A simple JavaScript snippet",
  "language": "javascript",
  "code": "const reverse = str => str.split('').reverse().join('');",
  "tags": ["javascript", "string"],
  "visibility": "public"
}
```

## Project Structure

```text
src/
  app.js
  config/
  controllers/
  middleware/
  models/
  routes/
  scripts/
```

The server entry point is server.js, and the Express app is initialized in src/app.js.