// ================= CONFIG =================
const API_URL = 'https://tetris-mini-game-2.onrender.com';
const STORAGE_KEY = 'tetris_user';

// ================= STATE =================
let currentUser = null;
let tetrisGame = null;

// ================= UTIL =================
function $(id) {
    return document.getElementById(id);
}

function safe(el) {
    return el !== null && el !== undefined;
}

// ================= USER =================
function initUser() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
        currentUser = JSON.parse(saved);
    } else {
        currentUser = {
            id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            name: 'Игрок',
            bestScore: 0,
            gamesPlayed: 0,
            totalScore: 0,
            achievements: {
                score100: false,
                score500: false,
                score1000: false,
                lines10: false,
                games5: false
            }
        };
    }

    saveUser();
}

function saveUser() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
}

// ================= API =================
async function sendScore(score, lines) {
    if (!currentUser) return;

    try {
        await fetch(`${API_URL}/api/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                name: currentUser.name,
                score,
                lines,
                period: getCurrentPeriod()
            })
        });

        currentUser.bestScore = Math.max(currentUser.bestScore, score);
        currentUser.totalScore += score;
        currentUser.gamesPlayed++;

        saveUser();

    } catch (e) {
        console.error('API ERROR:', e);
    }
}

async function loadLeaderboard() {
    const container = $('rating-list');
    if (!safe(container)) return;

    try {
        const res = await fetch(`${API_URL}/api/leaderboard?t=${Date.now()}`, {
        cache: "no-store"
        });
        const data = await res.json();

        if (!data.leaderboard?.length) {
            container.innerHTML = 'Нет данных';
            return;
        }

        container.innerHTML = data.leaderboard.map((p, i) => {
            return `
                <div class="rating-item ${p.userId === currentUser.id ? 'current-user' : ''}">
                    <div>#${i + 1}</div>
                    <div>${escapeHtml(p.name)}</div>
                    <div>${p.score}</div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error('LOAD ERROR:', e);
        container.innerHTML = 'Ошибка загрузки';
    }
}

// ================= UI =================
function initUI() {
    const startBtn = $('start-game-btn');
    const restartBtn = $('restart-game-btn');

    const startOverlay = $('start-overlay');
    const gameOverOverlay = $('game-over-overlay');

    if (safe(startBtn)) {
        startBtn.addEventListener('click', () => {
            if (safe(startOverlay)) startOverlay.style.display = 'none';
            startGame();
        });
    }

    if (safe(restartBtn)) {
        restartBtn.addEventListener('click', () => {
            if (safe(gameOverOverlay)) gameOverOverlay.style.display = 'none';
            startGame();
        });
    }
    const editBtn = $('edit-name-btn');
const modal = $('name-modal');

const saveBtn = $('save-name-btn');
const cancelBtn = $('cancel-name-btn');

const input = $('new-name-input');

if (editBtn && modal) {
    editBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        input.value = currentUser.name;
    });
}

if (cancelBtn && modal) {
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

if (saveBtn && input && modal) {
    saveBtn.addEventListener('click', () => {

        const newName = input.value.trim();

        if (!newName) return;

        currentUser.name = newName;

        saveUser();
        updateProfile();

        modal.style.display = 'none';
    });
}
}

    // tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;

        document.querySelectorAll('.tab-btn')
            .forEach(b => b.classList.remove('active'));

        document.querySelectorAll('.tab-content')
            .forEach(c => c.classList.remove('active'));

        btn.classList.add('active');

        const target = document.getElementById(tabId + '-tab');
        if (target) target.classList.add('active');

        if (tabId === 'rating') loadLeaderboard();
        if (tabId === 'profile') updateProfile();
    });
});
    // controls
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!tetrisGame?.isRunning) return;

            const move = btn.dataset.move;

            if (move === 'left') tetrisGame.moveLeft();
            if (move === 'right') tetrisGame.moveRight();
            if (move === 'rotate') tetrisGame.rotate();
            if (move === 'down') tetrisGame.moveDown();
        });
    });

    // keyboard
    document.addEventListener('keydown', (e) => {
        if (!tetrisGame) return;
        if (!tetrisGame.isRunning) return;

        if (e.key === 'ArrowLeft') tetrisGame.moveLeft();
        if (e.key === 'ArrowRight') tetrisGame.moveRight();
        if (e.key === 'ArrowUp') tetrisGame.rotate();
        if (e.key === 'ArrowDown') tetrisGame.moveDown();

        if (e.key === ' ') {
            e.preventDefault();
            tetrisGame.drop();
        }
    });

// ================= GAME EVENTS =================
window.addEventListener('gameEnd', async (e) => {

    if (!e.detail) return;

    const { score, lines } = e.detail;

    // сохранить результат
    await sendScore(score, lines);

    // обновить UI
    await loadLeaderboard();
    updateProfile();

    // показать game over
    const overlay = $('game-over-overlay');
    const scoreEl = $('final-score');
    const linesEl = $('final-lines');

    if (scoreEl) scoreEl.innerText = score;
    if (linesEl) linesEl.innerText = `Линий собрано: ${lines}`;

    if (overlay) {
        overlay.style.display = 'flex';
    }
});

// ================= PROFILE =================
function updateProfile() {
    if (!currentUser) return;

    const set = (id, val) => {
        const el = $(id);
        if (safe(el)) el.innerText = val;
    };

    set('user-name', currentUser.name);
    set('best-score', currentUser.bestScore);
    set('games-played', currentUser.gamesPlayed);
    set('total-score', currentUser.totalScore);
    updateAchievements();
}

const ACHIEVEMENTS = [
    {
        title: '🏅 100 очков',
        desc: 'Набери 100 очков',
        check: u => u.bestScore >= 100
    },
    {
        title: '🔥 500 очков',
        desc: 'Набери 500 очков',
        check: u => u.bestScore >= 500
    },
    {
        title: '👑 1000 очков',
        desc: 'Набери 1000 очков',
        check: u => u.bestScore >= 1000
    },
    {
        title: '🎮 5 игр',
        desc: 'Сыграй 5 игр',
        check: u => u.gamesPlayed >= 5
    }
];

function updateAchievements() {
    if (!currentUser) return;

    const list = $('achievements-list');
    if (!list) return;

    list.innerHTML = ACHIEVEMENTS.map(a => {
        const unlocked = a.check(currentUser);

        return `
            <div class="achievement ${unlocked ? 'unlocked' : 'locked'}">
                <div><b>${unlocked ? '✅' : '🔒'} ${a.title}</b></div>
                <div style="font-size:12px; opacity:0.7">${a.desc}</div>
            </div>
        `;
    }).join('');
}

// ================= HELPERS =================
function getCurrentPeriod() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()} ${d.getHours()}:00`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ================= START GAME =================
function startGame() {
    if (!tetrisGame) return;
    tetrisGame.start();
}

// ================= INIT APP =================
document.addEventListener('DOMContentLoaded', async () => { 

    initUser();

    tetrisGame = new Tetris('tetris-canvas');

    initUI();
    initGameEvents();

    await loadLeaderboard();
    updateProfile();
});