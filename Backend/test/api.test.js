import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_MAX = "20";
process.env.RATE_LIMIT_READ_MAX = "20";
process.env.RATE_LIMIT_WRITE_MAX = "20";
process.env.RATE_LIMIT_WINDOW_MS = "60000";

const { default: pool } = await import("../src/db/connection.js");
const { default: app } = await import("../src/app.js");

const task = {
  title: "Test task",
  description: "Created by an automated test",
  assigned_to: "Tester",
  priority: "High",
  due_date: "2026-12-31",
  status: "Pending",
};

let server;
let baseUrl;
let originalExecute;
let execute;

before(() => {
  originalExecute = pool.execute;
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

beforeEach(() => {
  execute = async () => {
    throw new Error("Unexpected database call in test");
  };
  pool.execute = (...args) => execute(...args);
});

after(() => {
  pool.execute = originalExecute;
  server.close();
});

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

describe("Task Management API", () => {
  it("returns a healthy response", async () => {
    const response = await request("/health");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      success: true,
      message: "Server is running",
    });
  });

  it("lists tasks using search and filters", async () => {
    execute = async (query, params) => {
      assert.match(query, /status = \?/);
      assert.match(query, /priority = \?/);
      assert.match(query, /title LIKE \?/);
      assert.deepEqual(params, ["Pending", "High", "%test%"]);
      return query.includes("COUNT(*)")
        ? [[{ total: 1 }]]
        : [[{ id: 1, ...task }]];
    };

    const response = await request(
      "/api/tasks?status=Pending&priority=High&search=test"
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.count, 1);
    assert.equal(response.body.data[0].id, 1);
  });

  it("returns pagination metadata and applies LIMIT/OFFSET", async () => {
    const calls = [];
    execute = async (query, params) => {
      calls.push({ query, params });
      if (query.includes("COUNT(*)")) return [[{ total: 48 }]];

      assert.match(query, /ORDER BY created_at DESC LIMIT 10 OFFSET 10/);
      assert.deepEqual(params, ["Pending"]);
      return [[{ id: 11, ...task, status: "Pending" }]];
    };

    const response = await request(
      "/api/tasks?status=Pending&page=2&pageSize=10"
    );

    assert.equal(response.status, 200);
    assert.equal(calls.length, 2);
    assert.equal(response.body.count, 1);
    assert.deepEqual(response.body.pagination, {
      page: 2,
      pageSize: 10,
      total: 48,
      totalPages: 5,
      hasNextPage: true,
    });
    assert.equal(response.body.data[0].status, "Pending");
  });

  it("reports the final page correctly", async () => {
    execute = async (query) =>
      query.includes("COUNT(*)") ? [[{ total: 20 }]] : [[{ id: 20, ...task }]];

    const response = await request("/api/tasks?page=2&pageSize=10");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.pagination, {
      page: 2,
      pageSize: 10,
      total: 20,
      totalPages: 2,
      hasNextPage: false,
    });
  });

  it("creates a task", async () => {
    execute = async (query, params) => {
      assert.match(query, /INSERT INTO tasks/);
      assert.deepEqual(params, [
        task.title,
        task.description,
        task.assigned_to,
        task.priority,
        task.due_date,
        task.status,
      ]);
      return [{ insertId: 7 }];
    };

    const response = await request("/api/tasks", {
      method: "POST",
      body: JSON.stringify(task),
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.id, 7);
    assert.equal(response.body.data.title, task.title);
  });

  it("rejects an invalid task before querying the database", async () => {
    const response = await request("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ ...task, priority: "Urgent", title: "" }),
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.ok(response.body.errors.length >= 2);
  });

  it("returns a task by ID", async () => {
    execute = async () => [[{ id: 1, ...task }]];

    const response = await request("/api/tasks/1");

    assert.equal(response.status, 200);
    assert.equal(response.body.data.id, 1);
  });

  it("rejects invalid task IDs", async () => {
    const response = await request("/api/tasks/not-a-number");

    assert.equal(response.status, 400);
    assert.match(response.body.errors[0].msg, /positive integer/);
  });

  it("rejects invalid filter values", async () => {
    const response = await request("/api/tasks?status=Unknown");

    assert.equal(response.status, 400);
    assert.match(response.body.errors[0].msg, /Status must be one of/);
  });

  it("rejects invalid calendar dates", async () => {
    const response = await request("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ ...task, due_date: "2026-02-30" }),
    });

    assert.equal(response.status, 400);
    assert.match(response.body.errors[0].msg, /valid calendar date/);
  });

  it("returns 404 when a task does not exist", async () => {
    execute = async () => [[]];

    const response = await request("/api/tasks/999");

    assert.equal(response.status, 404);
    assert.equal(response.body.message, "Task not found");
  });

  it("updates and deletes a task", async () => {
    let call = 0;
    execute = async (query) => {
      call += 1;
      if (call === 1) {
        assert.match(query, /UPDATE tasks/);
        return [{ affectedRows: 1 }];
      }

      assert.match(query, /DELETE FROM tasks/);
      return [{ affectedRows: 1 }];
    };

    const updated = await request("/api/tasks/1", {
      method: "PUT",
      body: JSON.stringify(task),
    });
    const deleted = await request("/api/tasks/1", { method: "DELETE" });

    assert.equal(updated.status, 200);
    assert.equal(deleted.status, 200);
    assert.equal(call, 2);
  });

  it("returns dashboard counts from database values", async () => {
    execute = async (query) => {
      assert.match(query, /COUNT\(\*\)/);
      return [
        [
          {
            totalTasks: "4",
            pendingTasks: "1",
            inProgressTasks: "2",
            completedTasks: "1",
          },
        ],
      ];
    };

    const response = await request("/api/dashboard/summary");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, {
      totalTasks: 4,
      pendingTasks: 1,
      inProgressTasks: 2,
      completedTasks: 1,
    });
  });

  it("limits excessive API requests", async () => {
    execute = async () => [[]];

    const responses = await Promise.all(
      Array.from({ length: 25 }, () => request("/api/tasks"))
    );
    const rateLimitedResponses = responses.filter(({ status }) => status === 429);

    assert.ok(rateLimitedResponses.length > 0);
    assert.deepEqual(rateLimitedResponses[0].body, {
      success: false,
      message: "Too many requests, please try again later.",
    });
  });
});
