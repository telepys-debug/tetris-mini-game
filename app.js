// ========== КОНФИГУРАЦИЯ ==========
// ⚠️ ПОМЕНЯЙТЕ ЭТУ ССЫЛКУ после деплоя сервера!
const API_URL = 'https://tetris-mini-game-2.onrender.com'; // Ссылка на ваш сервер

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

// ========== РЕЙТИНГ (СЕРВЕР) ==========
async function addScoreToLeaderboard(score, lines) {
    if (!currentUser) return;
    
    const period = getCurrentPeriod();
    
    try {
        await fetch(`${API_URL}/api/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                name: currentUser.name,
                score: score,
                lines: lines,
                period: period
            })
        });
        
        currentUser.bestScore = Math.max(currentUser.bestScore, score);
        currentUser.totalScore += score;
        currentUser.gamesPlayed++;
        saveUser();
        
        await loadPeriods();
        await renderLeaderboard();
        updateProfileUI();
        
    } catch (error) {
        console.error('Failed to save score:', error);
        alert('Ошибка подключения к рейтингу. Игра сохранена локально.');
        
        // Сохраняем локально для повторной отправки
        const pending = JSON.parse(localStorage.getItem('pending_scores') || '[]');
        pending.push({ score, lines, period, timestamp: Date.now() });
        localStorage.setItem('pending_scores', JSON.stringify(pending));
    }
}

async function loadPeriods() {
    try {
        const response = await fetch(`${API_URL}/api/periods`);
        allPeriods = await response.json();
        if (allPeriods.length === 0) {
            allPeriods = [getCurrentPeriod()];
        }
        if (!currentPeriod || !allPeriods.includes(currentPeriod)) {
            currentPeriod = allPeriods[0];
        }
        renderPeriodSelector();
    } catch (error) {
        console.error('Failed to load periods:', error);
        allPeriods = [getCurrentPeriod()];
        currentPeriod = allPeriods[0];
    }
}

async function renderLeaderboard() {
    const container = document.getElementById('rating-list');
    if (!container) return;
    
    if (!currentPeriod) {
        container.innerHTML = 'Загрузка...';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/leaderboard?period=${encodeURIComponent(currentPeriod)}`);
        const data = await response.json();
        
        let myRank = null;
        
        if (data.leaderboard.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:20px;">Пока нет результатов</div>';
            return;
        }
        
        container.innerHTML = data.leaderboard.map((player, idx) => {
            
            // 👉 ВАЖНО: определяем своё место
            if (player.userId === currentUser?.id) {
                myRank = idx + 1;
            }
            
            return `
                <div class="rating-item ${player.userId === currentUser?.id ? 'current-user' : ''}">
                    <div class="rating-rank">#${idx + 1}</div>
                    <div class="rating-name">${escapeHtml(player.name)}</div>
                    <div>${player.score} 🎮</div>
                </div>
            `;
            
        }).join('');
        
        // 👉 Показываем место
        const rankEl = document.getElementById('my-rank');
        if (rankEl) {
            rankEl.innerText = myRank 
                ? `Ваше место: ${myRank}` 
                : 'Вы вне топа';
        }
        
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        container.innerHTML = '<div style="text-align:center;padding:20px;">Ошибка загрузки рейтинга</div>';
    }
}

function renderPeriodSelector() {
    const container = document.getElementById('period-selector');
    if (!container) return;
    
    container.innerHTML = allPeriods.map(period => `
        <button class="period-btn ${period === currentPeriod ? 'active' : ''}" data-period="${period}">
            ${getPeriodLabel(period)}
        </button>
    `).join('');
    
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPeriod = btn.dataset.period;
            renderLeaderboard();
        });
    });
}

async function renderHistory() {
    const container = document.getElementById('history-list');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_URL}/api/user-history/${currentUser.id}`);
        const history = await response.json();
        
        if (history.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:20px;">Нет сыгранных игр</div>';
            return;
        }
        
        container.innerHTML = history.map(h => `
            <div class="history-item">
                <span>${getPeriodLabel(h.period)}</span>
                <span>${h.bestScore} очков</span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load history:', error);
        container.innerHTML = '<div style="text-align:center;padding:20px;">Ошибка загрузки истории</div>';
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
});