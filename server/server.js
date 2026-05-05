const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Подключаем БД
const db = new sqlite3.Database('./scores.db');

// Создаём таблицы
db.run(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    lines INTEGER NOT NULL,
    period TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )
`);

// Получить текущий часовой период
function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:00`;
}

// Сохранить результат
app.post('/api/score', (req, res) => {
  const { userId, name, score, lines, period } = req.body;
  
  if (!userId || !name || score === undefined) {
    return res.status(400).json({ error: 'Missing data' });
  }
  
  const finalPeriod = period || getCurrentPeriod();
  const timestamp = Date.now();
  
  db.get(
  `SELECT MAX(score) as best FROM scores WHERE userId = ? AND period = ?`,
  [userId, finalPeriod],
  (err, row) => {
    if (row && row.best >= score) {
      return res.json({ ok: true }); // хуже — не сохраняем
    }

    db.run(
      `INSERT INTO scores (userId, name, score, lines, period, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, name, score, lines, finalPeriod, timestamp],
      (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ ok: true });
      }
    );
  }
);
});

// Получить рейтинг за период
app.get('/api/leaderboard', (req, res) => {
  const period = req.query.period || getCurrentPeriod();
  
  db.all(
    `SELECT userId, name, MAX(score) as score
     FROM scores
     WHERE period = ?
     GROUP BY userId
     ORDER BY score DESC
     LIMIT 50`,
    [period],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ period, leaderboard: rows });
    }
  );
});

// Получить все доступные периоды
app.get('/api/periods', (req, res) => {
  db.all(
    `SELECT DISTINCT period FROM scores ORDER BY period DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows.map(r => r.period));
    }
  );
});

// Получить историю игрока
app.get('/api/user-history/:userId', (req, res) => {
  const { userId } = req.params;
  
  db.all(
    `SELECT period, MAX(score) as bestScore
     FROM scores
     WHERE userId = ?
     GROUP BY period
     ORDER BY period DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Очистка старых записей (раз в час, старше 24 часов)
setInterval(() => {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  db.run(`DELETE FROM scores WHERE timestamp < ?`, [oneDayAgo]);
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT}`);
});