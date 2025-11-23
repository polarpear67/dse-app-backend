const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Railway automatically assigns a port via process.env.PORT
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '50mb' })); 
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- DATABASE CONNECTION ---
const pool = mysql.createPool({
    host: 'localhost',
    user: 'polarpear',           // The user you created in Step 3
    password: 'dbpassword',
    database: 'dse_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper for async/await queries
const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, res) => {
            if (err) return reject(err);
            resolve(res);
        });
    });
};

// --- HEALTH CHECK ---
app.get('/', (req, res) => {
    res.send('DSE Survival Kit API is Running! 🚀');
});

// --- API ENDPOINTS ---

// 1. TASKS
app.get('/api/tasks', async (req, res) => {
    try {
        const results = await query('SELECT * FROM tasks ORDER BY created_at DESC');
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { text } = req.body;
        // ID is AUTO_INCREMENT by DB. We only insert text and completed status.
        const result = await query('INSERT INTO tasks (text, completed) VALUES (?, ?)', [text, 0]);
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

// 2. QUESTIONS
app.get('/api/questions', async (req, res) => {
    try {
        const results = await query('SELECT * FROM questions');
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/questions', async (req, res) => {
    try {
        const { subject, topic, question, answer, image } = req.body;
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + 1);
        
        // ID is handled by DB Auto Increment
        const result = await query(
            'INSERT INTO questions (subject, topic, question_text, answer_text, image_data, next_review, review_interval) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [subject, topic, question, answer, image, nextReview]
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
        const { subject, description, dueDate, type } = req.body;
        // ID is handled by DB Auto Increment
        const result = await query('INSERT INTO diary (subject, description, due_date, type, completed) VALUES (?, ?, ?, ?, ?)', [subject, description, dueDate, type, 0]);
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
        const { description, amount, type, category } = req.body;
        // ID is handled by DB Auto Increment
        const result = await query('INSERT INTO finance (description, amount, type, category) VALUES (?, ?, ?, ?)', [description, amount, type, category]);
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
        const { title, date } = req.body;
        // ID is handled by DB Auto Increment
        const result = await query('INSERT INTO events (title, event_date) VALUES (?, ?)', [title, date]);
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
        const { title, body } = req.body;
        // ID is handled by DB Auto Increment
        const result = await query('INSERT INTO notes (title, body) VALUES (?, ?)', [title, body]);
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

// --- START SERVER ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

