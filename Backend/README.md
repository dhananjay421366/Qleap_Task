# Task Management System – Backend

Simple and clean REST API for managing tasks.  
Built with Node.js, Express and MySQL.

---

## Features

- Full CRUD for tasks
- Dashboard summary (Total / Pending / In Progress / Completed)
- Search by title
- Filter by status & priority
- Request validation
- Centralized error handling
- Environment based configuration

---

## Tech Stack

- Node.js
- Express.js
- MySQL2
- express-validator
- dotenv

---

## Project Structure

```
Backend/
├── src/
│   ├── controllers/
│   ├── db/
│   ├── middlewares/
│   ├── models/
│   ├── router/
│   ├── utils/
│   ├── app.js
│   ├── constants.js
│   └── index.js
├── database.sql
├── .env
├── package.json
└── README.md
```

---

## API Endpoints

| Method | Endpoint                    | Description                     |
|--------|-----------------------------|---------------------------------|
| GET    | /health                     | Health check                    |
| GET    | /health/ready               | Database readiness check        |
| GET    | /api/dashboard/summary      | Dashboard counts                |
| GET    | /api/tasks                  | List tasks (supports filters)   |
| GET    | /api/tasks/:id              | Get single task                 |
| POST   | /api/tasks                  | Create task                     |
| PUT    | /api/tasks/:id              | Update task                     |
| DELETE | /api/tasks/:id              | Delete task                     |

### Supported Query Params (GET /api/tasks)

```
?search=keyword
&status=Pending|In Progress|Completed
&priority=Low|Medium|High
&page=1
&pageSize=10
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env` file:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=task_management
NODE_ENV=development
CORS_ORIGINS=http://localhost:4200
# Optional API rate limiting settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_READ_MAX=100
RATE_LIMIT_WRITE_MAX=50
```

Set `CORS_ORIGINS` to a comma-separated list of trusted frontend origins in
production.

### 3. Database setup

```bash
mysql -u root -p < database.sql
```

### 4. Run the server

```bash
npm run dev
```

Server runs on `http://localhost:5000`

`/health` checks that the process is running. `/health/ready` also checks that
the database is reachable. Each response includes an `X-Request-Id` header,
and requests/errors are emitted as structured JSON logs.

The API allows 100 read requests and 50 write requests per 15-minute window by
default. Configure `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_READ_MAX`, and
`RATE_LIMIT_WRITE_MAX` in `.env` to change these values.

---

## Sample Payload

```json
{
  "title": "Finish Angular frontend",
  "description": "Complete dashboard and task listing",
  "assigned_to": "Dhananjay",
  "priority": "High",
  "due_date": "2026-11-05",
  "status": "Pending"
}
```

---

## Author

Dhananjay  
Junior Full-Stack Developer Assignment
