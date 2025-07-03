// --- ゲームの基本設定 ---
const config = {
    type: Phaser.AUTO,
    width: 550,
    height: 600,
    backgroundColor: '#000000',
    scene: {
        create: create,
        update: update
    }
};

// --- 定数 ---
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

// --- ゲーム変数 ---
let game = new Phaser.Game(config);
let board;
let player;
let cursors;
let spaceKey;
let escKey;
let dropTimer;
let score;
let scoreText;
let isGameOver;
let fixedBlocks;

// --- ゲームの初期化処理 ---
function create() {
    board = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
    cursors = this.input.keyboard.createCursorKeys();
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    score = 0;
    isGameOver = false;
    fixedBlocks = this.add.group();

    spawnTetromino.call(this);

    dropTimer = this.time.addEvent({
        delay: 1000,
        callback: moveDown,
        callbackScope: this,
        loop: true
    });

    // ★★★ 操作方法のテキストを英語に変更 ★★★
    const titleStyle = { fontSize: '22px', fill: '#ffffff' };
    const descStyle = { fontSize: '18px', fill: '#ffffff' };

    // スコア表示
    scoreText = this.add.text(15, 30, 'Score: 0', { fontSize: '20px', fill: '#ffffff' }).setOrigin(0, 0.5);

    // 操作方法
    this.add.text(330, 80, 'CONTROLS', titleStyle).setOrigin(0, 0.5);
    this.add.text(330, 130, '← → : Move', descStyle).setOrigin(0, 0.5);
    this.add.text(330, 160, '↑    : Rotate', descStyle).setOrigin(0, 0.5);
    this.add.text(330, 190, '↓    : Soft Drop', descStyle).setOrigin(0, 0.5);
    this.add.text(330, 220, 'Space : Hard Drop', descStyle).setOrigin(0, 0.5);
    this.add.text(330, 280, 'ESC   : Quit Game', descStyle).setOrigin(0, 0.5);
}

// --- ゲームのメインループ ---
function update() {
    if (isGameOver) return;

    if (Phaser.Input.Keyboard.JustDown(cursors.left)) move.call(this, -1);
    else if (Phaser.Input.Keyboard.JustDown(cursors.right)) move.call(this, 1);
    else if (Phaser.Input.Keyboard.JustDown(cursors.up)) rotate.call(this);
    
    if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
        hardDrop.call(this);
    }
    
    if (Phaser.Input.Keyboard.JustDown(escKey)) {
        isGameOver = true;
        dropTimer.remove();
        this.add.text(150, config.height / 2, 'GAME QUIT', { fontSize: '40px', fill: '#00ff00' }).setOrigin(0.5);
    }

    if (cursors.down.isDown) {
        dropTimer.delay = 50;
    } else {
        dropTimer.delay = 1000;
    }
}

// --- ハードドロップ用の関数 ---
function hardDrop() {
    while (!checkCollision(0, 1)) {
        player.y++;
    }
    moveDown.call(this);
}

// --- 新しいテトリミノを生成 ---
function spawnTetromino() {
    const types = 'IJLOSTZ';
    const type = types[Math.floor(Math.random() * types.length)];
    const tetromino = TETROMINOES[type];
    
    player = {
        x: Math.floor(BOARD_WIDTH / 2) - 1,
        y: 0,
        shape: tetromino.shape,
        color: tetromino.color,
        graphics: this.add.group()
    };

    if (checkCollision()) {
        isGameOver = true;
        this.add.text(150, config.height / 2, 'GAME OVER', { fontSize: '40px', fill: '#ff0000' }).setOrigin(0.5);
        dropTimer.remove();
    } else {
        drawPlayer.call(this);
    }
}

// --- プレイヤーのテトリミノを描画 ---
function drawPlayer() {
    player.graphics.clear(true, true);
    const shape = player.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const newX = (player.x + x) * BLOCK_SIZE;
                const newY = (player.y + y) * BLOCK_SIZE;
                const rect = this.add.rectangle(newX, newY, BLOCK_SIZE, BLOCK_SIZE, player.color).setOrigin(0);
                player.graphics.add(rect);
            }
        }
    }
}

// --- 衝突判定 ---
function checkCollision(offsetX = 0, offsetY = 0, newShape = player.shape) {
    for (let y = 0; y < newShape.length; y++) {
        for (let x = 0; x < newShape[y].length; x++) {
            if (newShape[y][x]) {
                const newX = player.x + x + offsetX;
                const newY = player.y + y + offsetY;
                if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) return true;
                if (newY >= 0 && board[newY][newX]) return true;
            }
        }
    }
    return false;
}

// --- ブロックを盤面に固定する ---
function lockTetromino() {
    const shape = player.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                board[player.y + y][player.x + x] = player.color;
            }
        }
    }
    player.graphics.clear(true, true);
    drawBoard.call(this);
}

// --- 左右に移動 ---
function move(dir) {
    if (!checkCollision(dir, 0)) {
        player.x += dir;
        drawPlayer.call(this);
    }
}

// --- 下に移動 ---
function moveDown() {
    if (!checkCollision(0, 1)) {
        player.y++;
        drawPlayer.call(this);
    } else {
        lockTetromino.call(this);
        clearLines.call(this);
        if (!isGameOver) {
            spawnTetromino.call(this);
        }
    }
}

// --- 回転 ---
function rotate() {
    const shape = player.shape;
    const newShape = [];
    for (let y = 0; y < shape[0].length; y++) {
        newShape[y] = [];
        for (let x = 0; x < shape.length; x++) {
            newShape[y][x] = shape[shape.length - 1 - x][y];
        }
    }

    if (!checkCollision(0, 0, newShape)) {
        player.shape = newShape;
        drawPlayer.call(this);
    }
}

// --- そろった列を消す ---
function clearLines() {
    let linesCleared = 0;
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            linesCleared++;
            board.splice(y, 1);
            board.unshift(Array(BOARD_WIDTH).fill(0));
            y++;
        }
    }
    if (linesCleared > 0) {
        score += linesCleared * 10;
        scoreText.setText('Score: ' + score);
    }
}

// --- 固定されたブロック全体を描画 ---
function drawBoard() {
    fixedBlocks.clear(true, true);
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (board[y][x]) {
                const color = board[y][x];
                const rect = this.add.rectangle(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE, color).setOrigin(0);
                fixedBlocks.add(rect);
            }
        }
    }
}