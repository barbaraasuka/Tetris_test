// --- シーンで使う定数やデータを先に定義 ---
const BLOCK_SIZE = 30;
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const TETROMINOES = {
    'I': { shape: [[1, 1, 1, 1]], color: 0x00f0f0 },
    'J': { shape: [[1, 0, 0], [1, 1, 1]], color: 0x0000f0 },
    'L': { shape: [[0, 0, 1], [1, 1, 1]], color: 0xf0a000 },
    'O': { shape: [[1, 1], [1, 1]], color: 0xf0f000 },
    'S': { shape: [[0, 1, 1], [1, 1, 0]], color: 0x00f000 },
    'T': { shape: [[0, 1, 0], [1, 1, 1]], color: 0xa000f0 },
    'Z': { shape: [[1, 1, 0], [0, 1, 1]], color: 0xf00000 }
};

// ★★★★★★★★★★★★★★★★★★★★★★★★★
// ★★★ スタート画面用のシーン ★★★
// ★★★★★★★★★★★★★★★★★★★★★★★★★
class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    create() {
        // ★★★ config.width を this.sys.game.config.width に修正 ★★★
        const screenCenterX = this.sys.game.config.width / 2;

        // タイトルを表示
        this.add.text(screenCenterX, 250, 'TETRIS GAME', { fontSize: '50px', fill: '#ffffff' }).setOrigin(0.5);

        // スタート画面にブロックを表示する処理
        const blockData = TETROMINOES['T'];
        const shape = blockData.shape;
        const color = blockData.color;
        
        const shapeWidthInBlocks = shape[0].length;
        const shapeHeightInBlocks = shape.length;
        
        // ブロックを描画する開始位置を計算して、画面中央に配置
        const startX = screenCenterX - (shapeWidthInBlocks * BLOCK_SIZE / 2);
        const startY = 150 - (shapeHeightInBlocks * BLOCK_SIZE / 2);

        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    this.add.rectangle(startX + x * BLOCK_SIZE, startY + y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, color).setStrokeStyle(2, 0x555555).setOrigin(0);
                }
            }
        }

        // スタートボタンを作成
        const startButton = this.add.text(screenCenterX, 400, 'Click to Start', { fontSize: '40px', fill: '#00ff00', backgroundColor: '#555' })
            .setOrigin(0.5)
            .setPadding(20, 10)
            .setInteractive();

        // ボタンが押されたらゲームシーンを開始
        startButton.on('pointerdown', () => {
            this.scene.start('GameScene');
        });
    }
}


// ★★★★★★★★★★★★★★★★★★★★★★★★★
// ★★★ ゲーム本体のシーン ★★★
// ★★★★★★★★★★★★★★★★★★★★★★★★★
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        this.board = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        this.score = 0;
        this.isGameOver = false;
        this.fixedBlocks = this.add.group();

        this.spawnTetromino();

        this.dropTimer = this.time.addEvent({
            delay: 1000,
            callback: this.moveDown,
            callbackScope: this,
            loop: true
        });

        const titleStyle = { fontSize: '22px', fill: '#ffffff' };
        const descStyle = { fontSize: '18px', fill: '#ffffff' };
        this.scoreText = this.add.text(15, 30, 'Score: 0', { fontSize: '20px', fill: '#ffffff' }).setOrigin(0, 0.5);
        this.add.text(330, 80, 'CONTROLS', titleStyle).setOrigin(0, 0.5);
        this.add.text(330, 130, '← → : Move', descStyle).setOrigin(0, 0.5);
        this.add.text(330, 160, '↑    : Rotate', descStyle).setOrigin(0, 0.5);
        this.add.text(330, 190, '↓    : Soft Drop', descStyle).setOrigin(0, 0.5);
        this.add.text(330, 220, 'Space : Hard Drop', descStyle).setOrigin(0, 0.5);
        this.add.text(330, 280, 'ESC   : Quit Game', descStyle).setOrigin(0, 0.5);
    }

    update() {
        if (this.isGameOver) return;

        if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) this.move(-1);
        else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) this.move(1);
        else if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) this.rotate();
        
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.hardDrop();
        }
        
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.isGameOver = true;
            this.dropTimer.remove();
            this.add.text(150, 300, 'GAME QUIT', { fontSize: '40px', fill: '#00ff00' }).setOrigin(0.5);
            this.add.text(150, 350, 'Click to Restart', { fontSize: '20px', fill: '#ffffff' }).setOrigin(0.5);
            this.input.once('pointerdown', () => this.scene.start('StartScene'));
        }

        if (this.cursors.down.isDown) {
            this.dropTimer.delay = 50;
        } else {
            this.dropTimer.delay = 1000;
        }
    }

    hardDrop() {
        while (!this.checkCollision(0, 1)) {
            this.player.y++;
        }
        this.moveDown();
    }

    spawnTetromino() {
        const types = 'IJLOSTZ';
        const type = types[Math.floor(Math.random() * types.length)];
        const tetromino = TETROMINOES[type];
        
        this.player = {
            x: Math.floor(BOARD_WIDTH / 2) - 1,
            y: 0,
            shape: tetromino.shape,
            color: tetromino.color,
            graphics: this.add.group()
        };

        if (this.checkCollision()) {
            this.isGameOver = true;
            this.dropTimer.remove();
            this.add.text(150, 300, 'GAME OVER', { fontSize: '40px', fill: '#ff0000' }).setOrigin(0.5);
            this.add.text(150, 350, 'Click to Restart', { fontSize: '20px', fill: '#ffffff' }).setOrigin(0.5);
            this.input.once('pointerdown', () => this.scene.start('StartScene'));
        } else {
            this.drawPlayer();
        }
    }

    drawPlayer() {
        this.player.graphics.clear(true, true);
        const shape = this.player.shape;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const newX = (this.player.x + x) * BLOCK_SIZE;
                    const newY = (this.player.y + y) * BLOCK_SIZE;
                    const rect = this.add.rectangle(newX, newY, BLOCK_SIZE, BLOCK_SIZE, this.player.color).setOrigin(0);
                    this.player.graphics.add(rect);
                }
            }
        }
    }

    checkCollision(offsetX = 0, offsetY = 0, newShape = this.player.shape) {
        for (let y = 0; y < newShape.length; y++) {
            for (let x = 0; x < newShape[y].length; x++) {
                if (newShape[y][x]) {
                    const newX = this.player.x + x + offsetX;
                    const newY = this.player.y + y + offsetY;
                    if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) return true;
                    if (newY >= 0 && this.board[newY][newX]) return true;
                }
            }
        }
        return false;
    }

    lockTetromino() {
        const shape = this.player.shape;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    this.board[this.player.y + y][this.player.x + x] = this.player.color;
                }
            }
        }
        this.player.graphics.clear(true, true);
        this.drawBoard();
    }

    move(dir) {
        if (!this.checkCollision(dir, 0)) {
            this.player.x += dir;
            this.drawPlayer();
        }
    }

    moveDown() {
        if (!this.checkCollision(0, 1)) {
            this.player.y++;
            this.drawPlayer();
        } else {
            this.lockTetromino();
            this.clearLines();
            if (!this.isGameOver) {
                this.spawnTetromino();
            }
        }
    }

    rotate() {
        const shape = this.player.shape;
        const newShape = [];
        for (let y = 0; y < shape[0].length; y++) {
            newShape[y] = [];
            for (let x = 0; x < shape.length; x++) {
                newShape[y][x] = shape[shape.length - 1 - x][y];
            }
        }

        if (!this.checkCollision(0, 0, newShape)) {
            this.player.shape = newShape;
            this.drawPlayer();
        }
    }

    clearLines() {
        let linesCleared = 0;
        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                linesCleared++;
                this.board.splice(y, 1);
                this.board.unshift(Array(BOARD_WIDTH).fill(0));
                y++;
            }
        }
        if (linesCleared > 0) {
            this.score += linesCleared * 10;
            this.scoreText.setText('Score: ' + this.score);
            this.drawBoard();
        }
    }

    drawBoard() {
        this.fixedBlocks.clear(true, true);
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) { 
                if (this.board[y][x]) {
                    const color = this.board[y][x];
                    const rect = this.add.rectangle(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, color).setOrigin(0);
                    this.fixedBlocks.add(rect);
                }
            }
        }
    }
}


// --- ゲーム設定と起動 ---
const config = {
    type: Phaser.AUTO,
    width: 550,
    height: 600,
    backgroundColor: '#000000',
    parent: 'game-container',
    scene: [StartScene, GameScene]
};

let game = new Phaser.Game(config);