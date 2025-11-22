const express = require("express");
require("dotenv").config(); // You might need to: npm install dotenv
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

// --- MIDDLEWARE ---
app.use(cors()); // Allows your React app (on port 5173) to talk to this server
app.use(bodyParser.json({ limit: "50mb" })); // Increased limit to allow uploading images (Base64)
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// --- DATABASE CONNECTION ---
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: true }, // Required for cloud DBs
  waitForConnections: true,
  connectionLimit: 10,
});

// Test the connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Error connecting to MySQL:", err.message);
    console.log("   (Make sure XAMPP is running and you created the database)");
  } else {
    console.log("✅ Connected to MySQL Database");
    connection.release();
  }
});

// --- API ENDPOINTS ---

// 1. TASKS API
app.get("/api/tasks", (req, res) => {
  db.query("SELECT * FROM tasks ORDER BY created_at DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/tasks", (req, res) => {
  const { text, user_id = 1 } = req.body;
  db.query(
    "INSERT INTO tasks (user_id, text) VALUES (?, ?)",
    [user_id, text],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, text, completed: 0 });
    }
  );
});

app.put("/api/tasks/:id", (req, res) => {
  const { completed } = req.body;
  db.query(
    "UPDATE tasks SET completed = ? WHERE id = ?",
    [completed, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete("/api/tasks/:id", (req, res) => {
  db.query("DELETE FROM tasks WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 2. QUESTION BANK API
app.get("/api/questions", (req, res) => {
  db.query("SELECT * FROM questions", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/questions", (req, res) => {
  const { subject, topic, question, answer, image, user_id = 1 } = req.body;
  // Default next review is tomorrow
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + 1);

  const sql =
    "INSERT INTO questions (user_id, subject, topic, question_text, answer_text, image_data, next_review, review_interval) VALUES (?, ?, ?, ?, ?, ?, ?, 1)";
  db.query(
    sql,
    [user_id, subject, topic, question, answer, image, nextReview],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, ...req.body });
    }
  );
});

app.put("/api/questions/:id/review", (req, res) => {
  const { interval } = req.body;
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  db.query(
    "UPDATE questions SET next_review = ?, review_interval = ? WHERE id = ?",
    [nextReview, interval, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// 3. DIARY (HOMEWORK) API
app.get("/api/diary", (req, res) => {
  db.query("SELECT * FROM diary ORDER BY due_date ASC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/diary", (req, res) => {
  const { subject, description, dueDate, type, user_id = 1 } = req.body;
  const sql =
    "INSERT INTO diary (user_id, subject, description, due_date, type) VALUES (?, ?, ?, ?, ?)";
  db.query(
    sql,
    [user_id, subject, description, dueDate, type],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, ...req.body });
    }
  );
});

app.put("/api/diary/:id", (req, res) => {
  const { completed } = req.body;
  db.query(
    "UPDATE diary SET completed = ? WHERE id = ?",
    [completed, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete("/api/diary/:id", (req, res) => {
  db.query("DELETE FROM diary WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 4. FINANCE API
app.get("/api/finance", (req, res) => {
  db.query(
    "SELECT * FROM finance ORDER BY transaction_date DESC",
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

app.post("/api/finance", (req, res) => {
  const { description, amount, type, category, user_id = 1 } = req.body;
  const sql =
    "INSERT INTO finance (user_id, description, amount, type, category) VALUES (?, ?, ?, ?, ?)";
  db.query(
    sql,
    [user_id, description, amount, type, category],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, ...req.body });
    }
  );
});

app.delete("/api/finance/:id", (req, res) => {
  db.query("DELETE FROM finance WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 5. CALENDAR EVENTS API
app.get("/api/events", (req, res) => {
  db.query("SELECT * FROM events", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/api/events", (req, res) => {
  const { title, date, user_id = 1 } = req.body;
  const sql =
    "INSERT INTO events (user_id, title, event_date) VALUES (?, ?, ?)";
  db.query(sql, [user_id, title, date], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, title, event_date: date });
  });
});

app.delete("/api/events/:id", (req, res) => {
  db.query("DELETE FROM events WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 6. NOTES API
app.get("/api/notes", (req, res) => {
  db.query(
    "SELECT * FROM notes ORDER BY last_modified DESC",
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

app.post("/api/notes", (req, res) => {
  const { title, body, user_id = 1 } = req.body;
  const sql = "INSERT INTO notes (user_id, title, body) VALUES (?, ?, ?)";
  db.query(sql, [user_id, title, body], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, title, body });
  });
});

app.put("/api/notes/:id", (req, res) => {
  const { title, body } = req.body;
  db.query(
    "UPDATE notes SET title = ?, body = ? WHERE id = ?",
    [title, body, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Export the app for Vercel to handle
module.exports = app;