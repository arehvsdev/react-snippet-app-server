# React Snippet App Server 🚀

A feature-rich, secure Node.js & Express RESTful API server for managing code snippets, user authentication, profile management, bookmarks, comments, admin administration, and Razorpay payment integration for PRO subscription plans.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Environment Variables](#-environment-variables)
- [Installation & Setup](#-installation--setup)
- [Available Scripts](#-available-scripts)
- [Project Architecture](#-project-architecture)
- [API Documentation](#-api-documentation)
  - [Health & Root](#1-health--root)
  - [Authentication](#2-authentication-apiauth)
  - [User Profile Management](#3-user-profile-apiusers)
  - [Code Snippets, Bookmarks & Comments](#4-code-snippets-apisnippets)
  - [Payment & Razorpay Integration](#5-payments-apipayment)
  - [Subscriptions](#6-subscriptions-apisubscription)
  - [Dashboard Stats](#7-dashboard-apidashboard)
  - [Taxonomies (Categories, Languages, Tags)](#8-taxonomies-apicategories-apilanguages-apitags)
  - [Admin Administration](#9-admin-apiadmin)
- [Error Handling & Security](#-error-handling--security)
- [Interactive API Docs (Swagger)](#-interactive-api-docs-swagger)

---

## ✨ Features

- **Authentication & Security**: JWT-based authentication, bcrypt password hashing, input sanitization, rate limiting, and security headers via Helmet.
- **Password Reset & Verification**: Multi-step email verification and password reset flows.
- **Snippet Management**: Full CRUD operations with filtering, search, pagination, tags, language categorization, public/private visibility.
- **Bookmarks & Community**: Bookmarking favorite snippets, paginated bookmark retrieval, user comments.
- **User Profile**: Personal profile updates, secure avatar image uploads (`multer`), and password changes with strict complexity validation.
- **Razorpay Payment Gateway**: Order creation, cryptographic SHA256 signature verification, and automated subscription status upgrading to **PRO**.
- **Admin Control Panel**: User role management, platform analytics/dashboard, and global taxonomy controls (Categories, Languages, Tags).

---

## 🛠 Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ORM
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs`
- **File Storage**: Multer (avatar uploads stored in `/uploads`)
- **Payments**: Razorpay Node SDK (`razorpay`)
- **Security & Rate Limiting**: `helmet`, `express-rate-limit`, `cors`
- **Documentation**: Swagger UI (`swagger-ui-express`)
- **Development Tooling**: `nodemon`

---

## 📦 Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local instance running at `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI
- **Razorpay Account** *(Optional for testing payment features)*: Test Key ID and Secret from Razorpay Dashboard

---

## ⚙ Environment Variables

Create a `.env` file in the `react-snippet-app-server-main` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database Connection
MONGO_URI=mongodb://127.0.0.1:27017/react-snippet-app

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Razorpay Payment Gateway Keys (Optional / Required for Payments)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxx_your_secret_xxxxxx
```

---

## 🚀 Installation & Setup

1. **Navigate to the server directory**:
   ```bash
   cd react-snippet-app-server-main
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Seed Initial Admin User** *(Optional)*:
   ```bash
   npm run seed:admin
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   The server starts on `http://localhost:5000`.

---

## 📜 Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `dev` | `npm run dev` | Starts server with `nodemon` for auto-reloading during development |
| `start` | `npm start` | Runs server with `nodemon`/`node` in production mode |
| `seed:admin` | `npm run seed:admin` | Seeds default administrator credentials into MongoDB |

---

## 📁 Project Architecture

```text
react-snippet-app-server-main/
├── server.js               # Entry point - starts server & connects DB
├── swagger.json            # Swagger API OpenAPI 3.0 specification
├── package.json            # Dependencies and scripts
└── src/
    ├── app.js              # Express app setup, middlewares & route mounting
    ├── config/             # DB & Razorpay configurations
    │   ├── db.js
    │   ├── razorpay.js
    │   └── paymentConfig.js
    ├── controllers/        # Request handlers & logic routing
    │   ├── authController.js
    │   ├── userController.js
    │   ├── snippetController.js
    │   ├── paymentController.js
    │   ├── subscriptionController.js
    │   ├── adminController.js
    │   └── ...
    ├── middleware/         # Auth, Upload, Error handling, Rate limiting
    │   ├── authMiddleware.js
    │   ├── uploadMiddleware.js
    │   ├── errorHandler.js
    │   └── notFound.js
    ├── models/             # Mongoose Schemas (User, Snippet, Payment, etc.)
    ├── routes/             # Express API route modules
    ├── services/           # Database queries & external API integrations
    └── scripts/            # Database seed scripts
```

---

## 📖 API Documentation

**Base URL**: `http://localhost:5000`

### 1. Health & Root

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | System status and MongoDB connection check |
| `GET` | `/` | Public | Welcome message & server status |

---

### 2. Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/check-username?username=alex` | Public | Checks if a username is available |
| `POST` | `/api/auth/register` | Public | Registers a new user account |
| `POST` | `/api/auth/login` | Public | Authenticates user & returns JWT token |
| `POST` | `/api/auth/verify-email` | Public | Verifies email address for password reset |
| `POST` | `/api/auth/reset-password` | Public | Resets user password after verification |

#### Example - Register (`POST /api/auth/register`)
```json
{
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "Password123!",
  "role": "developer",
  "phoneNumber": "1234567890"
}
```

#### Example - Login (`POST /api/auth/login`)
```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```

---

### 3. User Profile (`/api/users`)

*All routes require Authorization Header: `Bearer <JWT_TOKEN>`*

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/profile` | Protected | Returns authenticated user profile |
| `PUT` | `/api/users/profile` | Protected | Updates profile details (name, bio, phone, username) |
| `POST` | `/api/users/avatar` | Protected | Uploads avatar image (`multipart/form-data`) |
| `POST` | `/api/users/change-password` | Protected | Changes user password |

#### Example - Change Password (`POST /api/users/change-password`)
```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword456!"
}
```

---

### 4. Code Snippets, Bookmarks & Comments (`/api/snippets`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/snippets` | Public | Search & list snippets (supports filter & pagination) |
| `GET` | `/api/snippets/:id` | Public | Get single snippet by ID |
| `POST` | `/api/snippets` | Protected | Create a new code snippet |
| `PUT` | `/api/snippets/:id` | Protected | Update existing snippet (Author or Admin) |
| `DELETE` | `/api/snippets/:id` | Protected | Delete snippet (Author or Admin) |
| `POST` | `/api/snippets/:id/bookmarks` | Protected | Toggle bookmark status for a snippet |
| `GET` | `/api/snippets/my/bookmarks` | Protected | Get paginated bookmarked snippets |
| `GET` | `/api/snippets/:id/comments` | Public | Get comments for a snippet |
| `POST` | `/api/snippets/:id/comments` | Protected | Post a comment on a snippet |

#### Query Parameters (`GET /api/snippets`)
- `search` - Search by title or description string
- `language` - Filter by language name (e.g. `javascript`, `python`)
- `tag` - Filter by specific tag
- `userId` - Filter snippets created by user ID
- `page` & `limit` - Pagination controls

#### Example - Create Snippet (`POST /api/snippets`)
```json
{
  "title": "Async Utility Helper",
  "description": "Retries asynchronous tasks with exponential backoff.",
  "language": "javascript",
  "code": "async function retry(fn, retries = 3) { ... }",
  "tags": ["javascript", "async", "promises"],
  "visibility": "public"
}
```

---

### 5. Payments & Razorpay (`/api/payment`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/payment/status` | Public | Check if Razorpay keys are configured and active mode (`TEST`/`LIVE`) |
| `POST` | `/api/payment/create-order` | Protected | Create Razorpay Order ID for PRO subscription |
| `POST` | `/api/payment/verify` | Protected | Verify payment SHA256 signature & upgrade user plan to PRO |
| `GET` | `/api/payment/history` | Protected | Retrieve paginated payment history for user |

#### Example - Create Order (`POST /api/payment/create-order`)
```json
{
  "plan": "PRO"
}
```

#### Example - Verify Payment (`POST /api/payment/verify`)
```json
{
  "orderId": "order_Px123456789",
  "paymentId": "pay_Py987654321",
  "signature": "c5f94b321a..."
}
```

---

### 6. Subscriptions (`/api/subscription`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/subscription` | Protected | Get current user's plan details (`FREE` / `PRO`) |

---

### 7. Dashboard (`/api/dashboard`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/stats` | Protected | Overview statistics for current user (total snippets, bookmarks, count by language) |

---

### 8. Taxonomies (`/api/categories`, `/api/languages`, `/api/tags`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/categories` | Public | Get all snippet categories |
| `POST` | `/api/categories` | Admin | Create a new category |
| `DELETE` | `/api/categories/:id` | Admin | Delete category |
| `GET` | `/api/languages` | Public | Get supported programming languages |
| `POST` | `/api/languages` | Admin | Add a new supported language |
| `DELETE` | `/api/languages/:id` | Admin | Remove supported language |
| `GET` | `/api/tags` | Public | Get list of all tags |
| `POST` | `/api/tags` | Admin | Create tag |
| `DELETE` | `/api/tags/:id` | Admin | Delete tag |

---

### 9. Admin Administration (`/api/admin`)

*All routes require Admin role JWT Token.*

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/dashboard/stats` | Admin | Platform-wide analytics (total users, total snippets, subscriptions, top languages) |
| `GET` | `/api/admin/users` | Admin | Get paginated list of all users |
| `PUT` | `/api/admin/users/:id/role` | Admin | Change user role (`developer`, `student`, `mentor`, `recruiter`, `admin`) |
| `DELETE` | `/api/admin/users/:id` | Admin | Delete user account |
| `GET` | `/api/admin/subscriptions` | Admin | Paginated list of subscriptions across all users |

---

## 🔒 Error Handling & Security

1. **Standard Error Responses**: All API errors return uniform JSON payload format:
   ```json
   {
     "success": false,
     "message": "Error description here"
   }
   ```
2. **Rate Limiting**:
   - Authentication routes (`/api/auth`): Rate-limited to prevent brute-force attacks.
   - General API routes (`/api/`): Rate-limited to 300 requests per 15-minute window.
3. **HTTP Security Headers**: Enabled via `helmet` with custom cross-origin resource policy.
4. **CORS Protection**: Configured with strict origin checks depending on environment (`CLIENT_URL`).

---

## 📑 Interactive API Docs (Swagger)

When the server is running, you can access the full, interactive OpenAPI/Swagger specification at:

👉 **[http://localhost:5000/api-docs](http://localhost:5000/api-docs)**