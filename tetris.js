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
        
        this.cellSize = 16;
        this.canvas.width = 200;
        this.canvas.height = 400;

        this.ctx.imageSmoothingEnabled = false;
        this.lockDelay = false;
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

    // если сразу коллизия → стоп
    if (this.collision()) {
        this.gameOver();
        return;
    }
    this.draw();
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
            this.score += points[linesRemoved] || 0;
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
    if (!this.isRunning) return;
        const size = this.cellSize;

    // фон
    this.ctx.fillStyle = '#0a0a15';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // поле
    for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 10; x++) {

            const px = x * size;
            const py = y * size;

            if (this.grid[y][x]) {
                // блок
                this.ctx.fillStyle = '#7c3aed';
                this.ctx.fillRect(px + 1, py + 1, size - 2, size - 2);

            } else {
                // пустая клетка (почти невидимая)
                this.ctx.fillStyle = '#0f0f1a';
                this.ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
            }
        }
    }

    // текущая фигура
    if (this.currentPiece) {
        for (let y = 0; y < this.currentPiece.length; y++) {
            for (let x = 0; x < this.currentPiece[y].length; x++) {
                if (this.currentPiece[y][x]) {

                    const px = (this.currentX + x) * size;
                    const py = (this.currentY + y) * size;

                    this.ctx.fillStyle = '#a855f7';
                    this.ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
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
        this.currentPiece = null;
        this.draw();
        
        const event = new CustomEvent('gameEnd', {
            detail: {
                score: this.score,
                lines: this.linesCleared
            }
        });
        window.dispatchEvent(event);
    }
    
    start() {
    this.stop(); // важно

    this.grid = Array(20).fill().map(() => Array(10).fill(0));
    this.score = 0;
    this.linesCleared = 0;

    document.getElementById('score').innerText = '0';

    this.isRunning = true;
    this.spawnPiece();

    this.gameInterval = setInterval(() => {
        if (this.isRunning) this.moveDown();
    }, 400);

    this.draw();
}

stop() {
    this.isRunning = false;

    if (this.gameInterval) {
        clearInterval(this.gameInterval);
        this.gameInterval = null;
    }

    this.currentPiece = null;

    // очистка экрана
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
}}