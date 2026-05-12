class Tetris {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.score = 0;
        this.linesCleared = 0;
        this.isRunning = false;
        this.gameInterval = null;
        
        this.grid = Array(20).fill().map(() => Array(10).fill(0));
        
        this.pieces = {
            I: [[1,1,1,1]],
            O: [[1,1],[1,1]],
            T: [[0,1,0],[1,1,1]],
            S: [[0,1,1],[1,1,0]],
            Z: [[1,1,0],[0,1,1]],
            L: [[1,0,0],[1,1,1]],
            J: [[0,0,1],[1,1,1]]
        };
        
        this.currentPiece = null;
        this.currentX = 3;
        this.currentY = 0;
        
        this.cellSize = 30;
    }
    
    randomPiece() {
        const keys = Object.keys(this.pieces);
        const type = keys[Math.floor(Math.random() * keys.length)];
        return this.pieces[type].map(row => [...row]);
    }
    
    spawnPiece() {
        this.currentPiece = this.randomPiece();
        this.currentX = Math.floor((10 - this.currentPiece[0].length) / 2);
        this.currentY = 0;
        
        if (this.collision()) {
            this.gameOver();
        }
    }
    
    collision() {
        for (let y = 0; y < this.currentPiece.length; y++) {
            for (let x = 0; x < this.currentPiece[y].length; x++) {
                if (!this.currentPiece[y][x]) continue;
                
                const nx = this.currentX + x;
                const ny = this.currentY + y;
                
                if (nx < 0 || nx >= 10 || ny >= 20) return true;
                if (ny >= 0 && this.grid[ny][nx]) return true;
            }
        }
        return false;
    }
    
    merge() {
        for (let y = 0; y < this.currentPiece.length; y++) {
            for (let x = 0; x < this.currentPiece[y].length; x++) {
                if (this.currentPiece[y][x]) {
                    const ny = this.currentY + y;
                    const nx = this.currentX + x;
                    if (ny >= 0 && ny < 20) {
                        this.grid[ny][nx] = 1;
                    }
                }
            }
        }
        
        this.clearLines();
        this.spawnPiece();
        this.draw();
    }
    
    clearLines() {
        let linesRemoved = 0;
        
        for (let y = 19; y >= 0; y--) {
            if (this.grid[y].every(cell => cell === 1)) {
                this.grid.splice(y, 1);
                this.grid.unshift(Array(10).fill(0));
                linesRemoved++;
                y++;
            }
        }
        
        if (linesRemoved > 0) {
            this.linesCleared += linesRemoved;
            const points = [0, 100, 300, 500, 800];
            const addScore = points[Math.min(linesRemoved, 4)];
            this.score += addScore;
            document.getElementById('score').innerText = this.score;
        }
    }
    
    moveLeft() {
        this.currentX--;
        if (this.collision()) this.currentX++;
        this.draw();
    }
    
    moveRight() {
        this.currentX++;
        if (this.collision()) this.currentX--;
        this.draw();
    }
    
    moveDown() {
        this.currentY++;
        if (this.collision()) {
            this.currentY--;
            this.merge();
        }
        this.draw();
    }
    
    rotate() {
        const rotated = this.currentPiece[0].map((_, i) =>
            this.currentPiece.map(row => row[i]).reverse()
        );
        
        const oldPiece = this.currentPiece;
        this.currentPiece = rotated;
        
        if (this.collision()) {
            this.currentPiece = oldPiece;
        }
        this.draw();
    }
    
    drop() {
        while (!this.collision()) {
            this.currentY++;
        }
        this.currentY--;
        this.merge();
        this.draw();
    }
    
    draw() {
        this.ctx.fillStyle = '#0a0a15';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Отрисовка сетки
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 10; x++) {
                if (this.grid[y][x]) {
                    this.ctx.fillStyle = '#00d9ff';
                    this.ctx.fillRect(x * 30 + 1, y * 30 + 1, 28, 28);
                    this.ctx.fillStyle = '#00b4d8';
                    this.ctx.fillRect(x * 30 + 2, y * 30 + 2, 26, 26);
                } else {
                    this.ctx.fillStyle = '#1a1a2e';
                    this.ctx.fillRect(x * 30 + 1, y * 30 + 1, 28, 28);
                }
            }
        }
        
        // Отрисовка текущей фигуры
        if (this.currentPiece) {
            for (let y = 0; y < this.currentPiece.length; y++) {
                for (let x = 0; x < this.currentPiece[y].length; x++) {
                    if (this.currentPiece[y][x]) {
                        const px = (this.currentX + x) * 30;
                        const py = (this.currentY + y) * 30;
                        this.ctx.fillStyle = '#ff006e';
                        this.ctx.fillRect(px + 1, py + 1, 28, 28);
                        this.ctx.fillStyle = '#fb6b9e';
                        this.ctx.fillRect(px + 2, py + 2, 26, 26);
                    }
                }
            }
        }
    }
    
    gameOver() {
        this.isRunning = false;
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
        
        const event = new CustomEvent('gameEnd', {
            detail: {
                score: this.score,
                lines: this.linesCleared
            }
        });
        window.dispatchEvent(event);
    }
    
    start() {
        if (this.isRunning) return;
        
        // Сброс
        this.grid = Array(20).fill().map(() => Array(10).fill(0));
        this.score = 0;
        this.linesCleared = 0;
        document.getElementById('score').innerText = '0';
        
        this.spawnPiece();
        this.isRunning = true;
        
        if (this.gameInterval) clearInterval(this.gameInterval);
        this.gameInterval = setInterval(() => {
            if (this.isRunning) {
                this.moveDown();
            }
        }, 400);
        
        this.draw();
    }
}