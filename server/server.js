const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// ====== ФАЙЛ ХРАНЕНИЯ ======
const DATA_FILE = path.join(__dirname, 'scores.json');

// ====== ПАМЯТЬ ======
let scores = [];

// ====== ЗАГРУЗКА ДАННЫХ ======
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE);
            scores = JSON.parse(raw);
        }
    } catch (e) {
        console.log("Load error:", e);
        scores = [];
    }
}

// ====== СОХРАНЕНИЕ ======
function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(scores, null, 2));
    } catch (e) {
        console.log("Save error:", e);
    }
}

loadData();

// ====== ПЕРИОД ======
function getCurrentPeriod() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:00`;
}

// ====== СОХРАНЕНИЕ СКОРА ======
app.post('/api/score', (req, res) => {
    const { userId, name, score, lines, period } = req.body;

    if (!userId || !name || typeof score !== 'number') {
        return res.status(400).json({ error: 'Missing data' });
    }

    const finalPeriod = period || getCurrentPeriod();

    const existingBest = scores
        .filter(s => s.userId === userId && s.period === finalPeriod)
        .reduce((max, s) => Math.max(max, s.score), 0);

    if (existingBest >= score) {
        return res.json({ ok: true });
    }

    scores.push({
        userId,
        name,
        score,
        lines,
        period: finalPeriod,
        timestamp: Date.now()
    });

    saveData();

    res.json({ ok: true });
});

// ====== LEADERBOARD ======
app.get('/api/leaderboard', (req, res) => {
    const period = req.query.period || getCurrentPeriod();

    const filtered = scores.filter(s => s.period === period);

    const map = {};

    filtered.forEach(s => {
        if (!map[s.userId] || map[s.userId].score < s.score) {
            map[s.userId] = s;
        }
    });

    const leaderboard = Object.values(map)
        .sort((a, b) => b.score - a.score)
        .slice(0, 50)
        .map(({ userId, name, score }) => ({
            userId,
            name,
            score
        }));

    res.json({
        period,
        leaderboard
    });
});

// ====== PERIODS ======
app.get('/api/periods', (req, res) => {
    const periods = [...new Set(scores.map(s => s.period))];
    res.json(periods);
});

// ====== HISTORY ======
app.get('/api/user-history/:userId', (req, res) => {
    const { userId } = req.params;

    const userScores = scores.filter(s => s.userId === userId);

    const map = {};

    userScores.forEach(s => {
        if (!map[s.period] || map[s.period].score < s.score) {
            map[s.period] = s;
        }
    });

    res.json(Object.values(map));
});

// ====== CLEANUP ======
setInterval(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    scores = scores.filter(s => s.timestamp > oneDayAgo);
    saveData();
}, 60 * 60 * 1000);

// ====== START ======
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});