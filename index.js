const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. CRITICAL CORS FIX ---
// This tells the browser: "Yes, other websites are allowed to touch this data"d
app.use(cors({
    origin: 'https://dse-app-frontend-j6i4zs9bj-polarpear67s-projects.vercel.app/', // Allow ALL origins (Easiest for SBA projects)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle pre-flight requests (The browser "asks permission" before sending data)
app.options('*', cors());

app.use(bodyParser.json({ limit: '50mb' })); 
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- DATABASE CONNECTION ---
// Uses environment variables for Vercel security
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false }, // Critical for some cloud DBs
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
});

// Helper for async queries (Fixes "callback hell")
const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, res) => {
            if (err) return reject(err);
            resolve(res);
        });
    });
};

// Test Route
app.get('/', (req, res) => {
    res.send('DSE Survival Kit API is Live! 🚀');
});

// --- API ENDPOINTS (Refactored for Vercel Stability) ---

// 1. TASKS
app.get('/api/tasks', async (req, res) => {
    try {
        const results = await query('SELECT * FROM tasks ORDER BY created_at DESC');
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { text, user_id = 1 } = req.body;
        const result = await query('INSERT INTO tasks (user_id, text) VALUES (?, ?)', [user_id, text]);
        res.json({ id: result.insertId, text, completed: 0 });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { completed } = req.body;
        await query('UPDATE tasks SET completed = ? WHERE id = ?', [completed, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        await query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. QUESTION BANK
app.get('/api/questions', async (req, res) => {
    try {
        const results = await query('SELECT * FROM questions');
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/questions', async (req, res) => {
    try {
        const { subject, topic, question, answer, image, user_id = 1 } = req.body;
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + 1);
        
        const result = await query(
            'INSERT INTO questions (user_id, subject, topic, question_text, answer_text, image_data, next_review, review_interval) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
            [user_id, subject, topic, question, answer, image, nextReview]
        );
        res.json({ id: result.insertId, ...req.body });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/questions/:id/review', async (req, res) => {
    try {
        const { interval } = req.body;
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + interval);
        await query('UPDATE questions SET next_review = ?, review_interval = ? WHERE id = ?', [nextReview, interval, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. DIARY
app.get('/api/diary', async (req, res) => {
    try {
        const results = await query('SELECT * FROM diary ORDER BY due_date ASC');
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/diary', async (req, res) => {
    try {
        const { subject, description, dueDate, type, user_id = 1 } = req.body;
        const result = await query('INSERT INTO diary (user_id, subject, description, due_date, type) VALUES (?, ?, ?, ?, ?)', [user_id, subject, description, dueDate, type]);
        res.json({ id: result.insertId, ...req.body });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/diary/:id', async (req, res) => {
    try {
        const { completed } = req.body;
        await query('UPDATE diary SET completed = ? WHERE id = ?', [completed, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/diary/:id', async (req, res) => {
    try {
        await query('DELETE FROM diary WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. FINANCE
app.get('/api/finance', async (req, res) => {
    try {
        const results = await query('SELECT * FROM finance ORDER BY transaction_date DESC');
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/finance', async (req, res) => {
    try {
        const { description, amount, type, category, user_id = 1 } = req.body;
        const result = await query('INSERT INTO finance (user_id, description, amount, type, category) VALUES (?, ?, ?, ?, ?)', [user_id, description, amount, type, category]);
        res.json({ id: result.insertId, ...req.body });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/finance/:id', async (req, res) => {
    try {
        await query('DELETE FROM finance WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. EVENTS
app.get('/api/events', async (req, res) => {
    try {
        const results = await query('SELECT * FROM events');
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/events', async (req, res) => {
    try {
        const { title, date, user_id = 1 } = req.body;
        const result = await query('INSERT INTO events (user_id, title, event_date) VALUES (?, ?, ?)', [user_id, title, date]);
        res.json({ id: result.insertId, title, event_date: date });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/events/:id', async (req, res) => {
    try {
        await query('DELETE FROM events WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. NOTES
app.get('/api/notes', async (req, res) => {
    try {
        const results = await query('SELECT * FROM notes ORDER BY last_modified DESC');
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/notes', async (req, res) => {
    try {
        const { title, body, user_id = 1 } = req.body;
        const result = await query('INSERT INTO notes (user_id, title, body) VALUES (?, ?, ?)', [user_id, title, body]);
        res.json({ id: result.insertId, title, body });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/notes/:id', async (req, res) => {
    try {
        const { title, body } = req.body;
        await query('UPDATE notes SET title = ?, body = ? WHERE id = ?', [title, body, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});



// Export for Vercel
module.exports = app;

