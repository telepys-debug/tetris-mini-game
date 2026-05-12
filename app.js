// ========== КОНФИГУРАЦИЯ ==========
// ⚠️ ПОМЕНЯЙТЕ ЭТУ ССЫЛКУ после деплоя сервера!
const API_URL = 'https://tetris-mini-game-2.onrender.com';

// ========== ПОЛЬЗОВАТЕЛЬ ==========
let currentUser = null;
let tetrisGame = null;
let allPeriods = [];
let currentPeriod = null;

const STORAGE_KEY = 'tetris_user';

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
                score100: false, score500: false, score1000: false,
                lines10: false, games5: false
            }
        };
    }
    saveUser();
    updateProfileUI();
}

function saveUser() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
}

// ========== ДОСТИЖЕНИЯ ==========
function checkAchievements(score, lines) {
    let changed = false;
    
    if (score >= 100 && !currentUser.achievements.score100) {
        currentUser.achievements.score100 = true;
        changed = true;
        alert('🏆 Достижение: 100 очков!');
    }
    if (score >= 500 && !currentUser.achievements.score500) {
        currentUser.achievements.score500 = true;
        changed = true;
        alert('🏆 Достижение: 500 очков!');
    }
    if (score >= 1000 && !currentUser.achievements.score1000) {
        currentUser.achievements.score1000 = true;
        changed = true;
        alert('🏆 Достижение: 1000 очков!');
    }
    if (lines >= 10 && !currentUser.achievements.lines10) {
        currentUser.achievements.lines10 = true;
        changed = true;
        alert('🏆 Достижение: 10 линий за игру!');
    }
    if (currentUser.gamesPlayed >= 5 && !currentUser.achievements.games5) {
        currentUser.achievements.games5 = true;
        changed = true;
        alert('🏆 Достижение: 5 сыгранных игр!');
    }
    
    if (changed) {
        saveUser();
        updateProfileUI();
    }
}

// ========== РЕЙТИНГ (СТАБИЛЬНЫЙ ЛОКАЛЬНЫЙ) ==========
async function addScoreToLeaderboard(score, lines) {
    if (!currentUser) return;

    const period = getCurrentPeriod();

    try {
        const res = await fetch(`${API_URL}/api/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                name: currentUser.name,
                score,
                lines,
                period
            })
        });

        const data = await res.json();
        console.log('SAVED:', data);

        // обновляем профиль
        currentUser.bestScore = Math.max(currentUser.bestScore, score);
        currentUser.totalScore += score;
        currentUser.gamesPlayed++;
        saveUser();

    } catch (e) {
        console.error('SAVE ERROR:', e);
        alert('Сервер недоступен 😢');
    }
}
async function renderLeaderboard() {
    const container = document.getElementById('rating-list');
    if (!container) return;

    const period = getCurrentPeriod();

    try {
        const res = await fetch(`${API_URL}/api/leaderboard?period=${encodeURIComponent(period)}`);
        const data = await res.json();

        if (!data.leaderboard || data.leaderboard.length === 0) {
            container.innerHTML = 'Пока нет результатов';
            return;
        }

        let myRank = null;

        container.innerHTML = data.leaderboard.map((p, i) => {

            if (p.userId === currentUser.id) {
                myRank = i + 1;
            }

            return `
                <div class="rating-item ${p.userId === currentUser.id ? 'current-user' : ''}">
                    <div>#${i + 1}</div>
                    <div>${escapeHtml(p.name)}</div>
                    <div>${p.score}</div>
                </div>
            `;
        }).join('');

        document.getElementById('my-rank').innerText =
            myRank ? `Ваше место: ${myRank}` : 'Вы вне топа';

    } catch (e) {
        console.error('LOAD ERROR:', e);
        container.innerHTML = 'Ошибка загрузки 😢';
    }
}
async function loadPeriods() {
    await renderLeaderboard();
}
async function renderHistory() {
    const container = document.getElementById('history-list');
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/api/user-history/${currentUser.id}`);
        const data = await res.json();

        if (!data.length) {
            container.innerHTML = 'Нет истории';
            return;
        }

        container.innerHTML = data.map(h => `
            <div class="history-item">
                <span>${getPeriodLabel(h.period)}</span>
                <span>${h.bestScore}</span>
            </div>
        `).join('');

    } catch (e) {
        console.error(e);
        container.innerHTML = 'Ошибка';
    }
}

function updateProfileUI() {
    if (!currentUser) return;
    document.getElementById('user-name').innerText = currentUser.name;
    document.getElementById('best-score').innerText = currentUser.bestScore;
    document.getElementById('games-played').innerText = currentUser.gamesPlayed;
    document.getElementById('total-score').innerText = currentUser.totalScore;
    
    const achContainer = document.getElementById('achievements-list');
    const achievements = [
        { id: 'score100', name: '🎯 100 очков', unlocked: currentUser.achievements?.score100 },
        { id: 'score500', name: '🎯 500 очков', unlocked: currentUser.achievements?.score500 },
        { id: 'score1000', name: '🎯 1000 очков', unlocked: currentUser.achievements?.score1000 },
        { id: 'lines10', name: '📊 10 линий за игру', unlocked: currentUser.achievements?.lines10 },
        { id: 'games5', name: '🎮 5 игр сыграно', unlocked: currentUser.achievements?.games5 }
    ];
    
    achContainer.innerHTML = achievements.map(ach => `
        <div class="achievement ${ach.unlocked ? 'unlocked' : ''}">
            ${ach.name} ${ach.unlocked ? '✅' : '🔒'}
        </div>
    `).join('');
    
    renderHistory();
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function getCurrentPeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:00`;
}

function getPeriodLabel(period) {
    if (!period) return 'Неизвестно';

    const [date, hour] = period.split(' ');
    if (!date || !hour) return period;

    const [year, month, day] = date.split('-');

    return `${day}.${month} ${hour}–${String(Number(hour) + 1).padStart(2, '0')}:00`;
}

async function saveGameResult(gameData) {
    await addScoreToLeaderboard(gameData.score, gameData.lines);
    checkAchievements(gameData.score, gameData.lines);
    await renderLeaderboard();
    updateProfileUI();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async () => {
    initUser();
    
    tetrisGame = new Tetris('tetris-canvas');
    
    await loadPeriods();
    await renderLeaderboard();
    
    // Повторная отправка локально сохранённых результатов
    const pending = JSON.parse(localStorage.getItem('pending_scores') || '[]');
    for (const p of pending) {
        await addScoreToLeaderboard(p.score, p.lines);
    }
    localStorage.setItem('pending_scores', '[]');
    
    window.addEventListener('gameEnd', async (e) => {
        await saveGameResult(e.detail);
        await loadPeriods();
        await renderLeaderboard();
        updateProfileUI();
    });
    
    document.getElementById('start-game').addEventListener('click', () => {
        tetrisGame.start();
    });
    
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!tetrisGame.isRunning) return;
            const move = btn.dataset.move;
            if (move === 'left') tetrisGame.moveLeft();
            if (move === 'right') tetrisGame.moveRight();
            if (move === 'rotate') tetrisGame.rotate();
            if (move === 'down') tetrisGame.moveDown();
        });
    });
    
    document.addEventListener('keydown', (e) => {
        if (!tetrisGame.isRunning) return;
        if (e.key === 'ArrowLeft') tetrisGame.moveLeft();
        if (e.key === 'ArrowRight') tetrisGame.moveRight();
        if (e.key === 'ArrowUp') tetrisGame.rotate();
        if (e.key === 'ArrowDown') tetrisGame.moveDown();
        if (e.key === ' ') {
            e.preventDefault();
            tetrisGame.drop();
        }
        e.preventDefault();
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            if (tabId === 'rating') {
                renderLeaderboard();
            }
            if (tabId === 'profile') {
                updateProfileUI();
            }
        });
    });
    
    const modal = document.getElementById('name-modal');
    document.getElementById('edit-name-btn').addEventListener('click', () => {
        document.getElementById('new-name-input').value = currentUser.name;
        modal.style.display = 'flex';
    });
    document.getElementById('save-name-btn').addEventListener('click', async () => {
        const newName = document.getElementById('new-name-input').value.trim();
        if (newName && newName.length <= 20) {
            currentUser.name = newName;
            saveUser();
            updateProfileUI();
            await renderLeaderboard();
            modal.style.display = 'none';
        } else {
            alert('Имя должно быть от 1 до 20 символов');
        }
    });
    document.getElementById('cancel-name-btn').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    setInterval(async () => {
        const activeTab = document.querySelector('.tab-content.active')?.id;
        if (activeTab === 'rating-tab') {
            await renderLeaderboard();
        }
    }, 15000);
});window.addEventListener('gameEnd', (e) => {
    console.log("GAME END EVENT:", e.detail);
});
const startOverlay = document.getElementById('start-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');

const startBtn = document.getElementById('start-game-btn');
const restartBtn = document.getElementById('restart-game-btn');

startBtn.addEventListener('click', () => {

  startOverlay.style.display = 'none';

  startGame();
});

restartBtn.addEventListener('click', () => {

  gameOverOverlay.style.display = 'none';

  startGame();
});