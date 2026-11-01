# Task Management System

Angular frontend for the Technical Assignment – Task Management System.

## Features

- Dashboard with database-backed task counts
- Create, view, edit, and delete tasks
- Reactive form validation
- Search by title and filter by status or priority without a page reload
- Loading indicators, error states, toast notifications, and responsive layout

## Technology

- Angular 22, TypeScript, standalone components, Router, Reactive Forms, HttpClient, RxJS/signals
- Node.js/Express backend with MySQL

## Run locally

1. Start MySQL and run `../Backend/database.sql`.
2. Create `../Backend/.env` using the variables documented in the backend README.
3. Start the backend:

   ```bash
   cd ../Backend
   npm install
   npm run dev
   ```

   The API runs at `http://localhost:5000`.

4. Start the frontend:

   ```bash
   cd ../Frontend
   npm install
   npm start
   ```

   Open `http://localhost:4200`.

## API integration

The API base URL is configured in `src/environments/environment.ts` as `http://localhost:5000/api`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/tasks` | List tasks and apply filters |
| GET | `/api/tasks/:id` | Get one task |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/dashboard/summary` | Get dashboard counts |

## Validation

```bash
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

## Run with Docker

Build and start the frontend container:

```bash
docker compose up --build
```

Open `http://localhost:4200`. The compose setup starts the frontend, backend, and MySQL database together. The browser calls the backend at `http://localhost:5000/api`.

Stop the container with:

```bash
docker compose down
```

## Deliverables

- Backend source: `../Backend`
- MySQL schema: `../Backend/database.sql`
- Postman collection: `../Backend/Task_Management_API.postman_collection.json`
- Capture Dashboard, Task List, Add Task, and Edit Task screenshots after starting both services.
