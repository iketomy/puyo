const canvas = document.getElementById('game-canvas');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextContext = nextCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const restartButton = document.getElementById('restart-button');
const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const chainBonusElement = document.getElementById('chain-bonus'); // 追加

const COLS = 6;
const ROWS = 12;
const BLOCK_SIZE = 50;
const NEXT_BLOCK_SIZE = 50;

const PUYO_COLORS = { 1: 'red', 2: 'green', 3: 'blue', 4: 'yellow', 5: 'purple' };
const PUYO_COLOR_COUNT = Object.keys(PUYO_COLORS).length;

const PUYO_GRADIENT_COLORS = {
    1: { start: '#ff6b6b', end: '#ee3333' }, // Red
    2: { start: '#6bff6b', end: '#33ee33' }, // Green
    3: { start: '#6b6bff', end: '#3333ee' }, // Blue
    4: { start: '#ffff6b', end: '#eeee33' }, // Yellow
    5: { start: '#ff6bff', end: '#ee33ee' }  // Purple
};

// const sounds = {
//     rotate: new Audio('sounds/rotate.wav'),
//     lock: new Audio('sounds/lock.wav'),
//     clear: new Audio('sounds/clear.wav'),
//     chain: new Audio('sounds/chain.wav'),
//     gameover: new Audio('sounds/gameover.wav'),
//     bgm: new Audio('sounds/bgm.mp3')
// };

// // BGMのループ設定
// sounds.bgm.loop = true;

// function playSound(name) {
//     // ユーザーの操作がないと音声が再生されないブラウザ対策
//     if (name === 'bgm' && sounds.bgm.paused) {
//         sounds.bgm.play().catch(e => console.log("BGM playback failed:", e));
//     } else if (name !== 'bgm') {
//         sounds[name]?.currentTime = 0; // 再生位置を先頭に戻す
//         sounds[name]?.play().catch(e => console.log(`Sound ${name} playback failed:`, e));
//     }
// }

// function stopSound(name) {
//     sounds[name]?.pause();
//     sounds[name]?.currentTime = 0;
// }

let field = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); // ここを修正
let currentPuyo, nextPuyo;
let score = 0;
let highScore = 0;
let gameState = 'start'; // start, playing, checking, paused, gameover

let dropCounter = 0;
let dropInterval = 30;
let chainAnimation = { text: '', timer: 0 };

let puyosFading = []; // 消去中のぷよを管理する配列
let screenPulse = { active: false, alpha: 0, color: 'rgba(255, 255, 0, 0)' }; // 画面フラッシュ効果
let explosionEffect = { active: false, x: 0, y: 0, radius: 0, maxRadius: 0, alpha: 0, color: 'rgba(255, 165, 0, 0)' }; // 爆発効果

function loadHighScore() {
    const savedScore = localStorage.getItem('puyoHighScore');
    highScore = savedScore ? parseInt(savedScore, 10) : 0;
}

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('puyoHighScore', highScore);
    }
}

function createPuyoPair() {
    return { color: Math.floor(Math.random() * PUYO_COLOR_COUNT) + 1, childColor: Math.floor(Math.random() * PUYO_COLOR_COUNT) + 1 };
}

function initGame() {
    for (let r = 0; r < ROWS; r++) field[r] = Array(COLS).fill(0);
    score = 0;
    scoreElement.textContent = score;
    chainBonusElement.classList.add('hidden'); // 追加
    
    nextPuyo = createPuyoPair();
    spawnPuyo();
}

function startGame() {
    initGame();
    gameState = 'playing';
    updateOverlayVisibility();
    // playSound('bgm'); // ゲーム開始時にBGM再生
    // gameLoopはDOMContentLoadedで既に開始されているため、ここでは呼び出さない
}

function spawnPuyo() {
    currentPuyo = { x: Math.floor(COLS / 2) - 1, y: 0, rotation: 0, color: nextPuyo.color, child: { x: Math.floor(COLS / 2) - 1, y: -1, color: nextPuyo.childColor } };
    console.log('spawnPuyo: currentPuyo initialized at y=' + currentPuyo.y + ', child.y=' + currentPuyo.child.y);
    nextPuyo = createPuyoPair();
    drawNextPuyo();
    if (checkCollision(currentPuyo, 0, 0)) {
        gameState = 'gameover';
        console.log('spawnPuyo: Game Over on spawn!');
        // playSound('gameover');
        // stopSound('bgm'); // ゲームオーバー時にBGM停止
        saveHighScore();
    }
}

function checkCollision(puyo, nextX, nextY, nextChildX, nextChildY) {
    const checkPuyoX = puyo.x + nextX, checkPuyoY = puyo.y + nextY;
    const checkChildX = (nextChildX !== undefined) ? nextChildX : puyo.child.x + nextX;
    const checkChildY = (nextChildY !== undefined) ? nextChildY : puyo.child.y + nextY;
    if (checkPuyoX < 0 || checkPuyoX >= COLS || checkChildX < 0 || checkChildX >= COLS) return true;
    if (checkPuyoY >= ROWS || checkChildY >= ROWS) return true;
    if ((checkPuyoY >= 0 && field[checkPuyoY]?.[checkPuyoX] > 0) || (checkChildY >= 0 && field[checkChildY]?.[checkChildX] > 0)) return true;
    return false;
}

function lockPuyo() {
    if(currentPuyo.y >= 0) field[currentPuyo.y][currentPuyo.x] = currentPuyo.color;
    if(currentPuyo.child.y >= 0) field[currentPuyo.child.y][currentPuyo.child.x] = currentPuyo.child.color;
    currentPuyo = null;
    gameState = 'checking';
    // playSound('lock');
    handleChains();
}

async function handleChains() {
    applyGravity();
    draw();
    await sleep(200);
    let chainCount = 1;
    while (true) {
        const puyosToClear = findPuyosToClear();
        if (puyosToClear.length === 0) break;

        // 消去対象のぷよをフェードアウトリストに追加
        puyosFading = puyosToClear.map(([r, c]) => ({
            x: c,
            y: r,
            color: field[r][c],
            alpha: 1.0, // 初期透明度
            fadeSpeed: 0.1 // フェードアウト速度
        }));

        const chainBonus = Math.pow(2, chainCount);
        score += puyosToClear.length * 10 * chainBonus;
        scoreElement.textContent = score;
        
        // 連鎖ボーナス表示のロジックを追加
        if (chainCount > 1) {
            chainBonusElement.textContent = `${chainCount} CHAIN! x${chainBonus}`;
            chainBonusElement.classList.remove('hidden');
            setTimeout(() => {
                chainBonusElement.classList.add('hidden');
            }, 1500); // 1.5秒後に非表示

            // Activate screen pulse
            screenPulse.active = true;
            screenPulse.alpha = 0.6; // Start with a noticeable pulse
            screenPulse.color = 'rgba(255, 255, 0, 0.6)'; // Bright yellow pulse

            // Activate explosion effect
            let avgX = 0, avgY = 0;
            puyosToClear.forEach(([r, c]) => {
                avgX += c;
                avgY += r;
            });
            avgX = (avgX / puyosToClear.length) * BLOCK_SIZE + BLOCK_SIZE / 2;
            avgY = (avgY / puyosToClear.length) * BLOCK_SIZE + BLOCK_SIZE / 2;

            explosionEffect.active = true;
            explosionEffect.x = avgX;
            explosionEffect.y = avgY;
            explosionEffect.radius = 0;
            explosionEffect.maxRadius = Math.max(canvas.width, canvas.height) * 0.7; // Cover most of the screen
            explosionEffect.alpha = 1.0;
            explosionEffect.color = 'rgba(255, 165, 0, 1)'; // Bright orange explosion
            
            chainAnimation.timer = 120; // Increase animation duration for more dramatic effect

            // playSound('chain');
        } else { 
            chainBonusElement.classList.add('hidden'); // 1連鎖の場合は非表示を維持
            /* playSound('clear'); */ 
        }

        clearPuyos(puyosToClear);
        draw(); // フェードアウト開始時の描画
        await sleep(300); // フェードアウトアニメーションの時間

        applyGravity();
        draw(); await sleep(300);
        chainCount++;
    }
    gameState = 'playing';
    await sleep(300); // ここを追加
    spawnPuyo();
}

function findPuyosToClear() {
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const toClear = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (field[r][c] === 0 || visited[r][c]) continue;
            const connected = [], color = field[r][c], stack = [[r, c]];
            visited[r][c] = true;
            while (stack.length > 0) {
                const [row, col] = stack.pop();
                connected.push([row, col]);
                [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
                    const newRow = row + dr, newCol = col + dc;
                    if (newRow >= 0 && newRow < ROWS && newCol >= 0 && newCol < COLS && !visited[newRow][newCol] && field[newRow][newCol] === color) {
                        visited[newRow][newCol] = true;
                        stack.push([newRow, newCol]);
                    }
                });
            }
            if (connected.length >= 4) toClear.push(...connected);
        }
    }
    return toClear;
}

function clearPuyos(puyosToClear) {
    puyosToClear.forEach(([r, c]) => {
        field[r][c] = 0; // フィールドからはすぐに消す
    });
}

function applyGravity() {
    for (let c = 0; c < COLS; c++) {
        let emptyRow = ROWS - 1;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (field[r][c] !== 0) {
                if (r !== emptyRow) { field[emptyRow][c] = field[r][c]; field[r][c] = 0; }
                emptyRow--;
            }
        }
    }
}

function gameLoop() {
    // 描画は常に実行
    draw();

    // ゲームの状態に応じたロジック
    if (gameState === 'playing' && currentPuyo) {
        dropCounter++;
        if (dropCounter > dropInterval) {
            if (!checkCollision(currentPuyo, 0, 1)) { currentPuyo.y++; currentPuyo.child.y++; } 
            else { lockPuyo(); }
            dropCounter = 0;
        }
    } else if (gameState === 'gameover') {
        drawGameOver();
    } 

    // 次のフレームを要求
    gameLoop.animationFrameId = requestAnimationFrame(gameLoop);

    // オーバーレイの表示/非表示はupdateOverlayVisibilityで一元管理
    updateOverlayVisibility(); // gameLoop内で常に呼び出すことで、gameStateの変化を反映
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    // ゲームフィールド全体の背景色を塗りつぶす
    context.fillStyle = '#1a252f';
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (field[r][c] > 0) drawPuyo(context, c, r, field[r][c], BLOCK_SIZE);
        }
    }

    // フェードアウト中のぷよを描画
    puyosFading = puyosFading.filter(puyo => {
        puyo.alpha -= puyo.fadeSpeed;
        if (puyo.alpha > 0) {
            drawPuyo(context, puyo.x, puyo.y, puyo.color, BLOCK_SIZE, puyo.alpha);
            return true;
        }
        return false;
    });

    if (currentPuyo) {
        console.log('draw: Drawing currentPuyo at y=' + currentPuyo.y + ', child.y=' + currentPuyo.child.y);
        drawPuyo(context, currentPuyo.x, currentPuyo.y, currentPuyo.color, BLOCK_SIZE);
        drawPuyo(context, currentPuyo.child.x, currentPuyo.child.y, currentPuyo.child.color, BLOCK_SIZE);
    } else {
        console.log('draw: currentPuyo is null or undefined.');
    }

    // Draw and update screen pulse (before chain text)
    if (screenPulse.active) {
        context.save();
        context.globalAlpha = screenPulse.alpha;
        context.fillStyle = screenPulse.color;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.restore();

        screenPulse.alpha -= 0.03; // Fade out faster
        if (screenPulse.alpha <= 0) {
            screenPulse.active = false;
        }
    }

    // Draw and update explosion effect (before chain text)
    if (explosionEffect.active) {
        context.save();
        context.globalAlpha = explosionEffect.alpha;
        context.fillStyle = explosionEffect.color;
        context.beginPath();
        context.arc(explosionEffect.x, explosionEffect.y, explosionEffect.radius, 0, Math.PI * 2);
        context.fill();
        context.restore();

        explosionEffect.radius += 15; // Expand faster
        explosionEffect.alpha -= 0.02; // Fade out slower than radius expands
        if (explosionEffect.alpha <= 0 || explosionEffect.radius > explosionEffect.maxRadius) {
            explosionEffect.active = false;
        }
    }

    drawChainText();
}

function drawNextPuyo() {
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (nextPuyo) {
        drawPuyo(nextContext, 1, 1, nextPuyo.color, NEXT_BLOCK_SIZE);
        drawPuyo(nextContext, 1, 0, nextPuyo.childColor, NEXT_BLOCK_SIZE);
    }
}

function drawPuyo(ctx, x, y, colorIndex, size, alpha = 1.0) { // alpha引数を追加
    console.log('drawPuyo called for x=' + x + ', y=' + y + ', color=' + colorIndex);
    const gradientColors = PUYO_GRADIENT_COLORS[colorIndex];
    if (!gradientColors) {
        console.log('drawPuyo: No gradientColors for colorIndex ' + colorIndex);
        return;
    }
    if (y < 0) {
        console.log('drawPuyo: y is negative (' + y + '), not drawing.');
        return;
    }

    const centerX = x * size + size / 2;
    const centerY = y * size + size / 2;
    const radius = size / 2 - 2;

    const gradient = ctx.createRadialGradient(
        centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.1,
        centerX, centerY, radius
    );
    gradient.addColorStop(0, gradientColors.start);
    gradient.addColorStop(1, gradientColors.end);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.3, centerY - radius * 0.2, radius * 0.1, 0, Math.PI * 2);
    ctx.arc(centerX + radius * 0.3, centerY - radius * 0.2, radius * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY + radius * 0.2, radius * 0.2, 0, Math.PI, false);
    ctx.stroke();

    ctx.globalAlpha = 1.0; // 透明度をリセット
}

function drawChainText() {
    if (chainAnimation.timer > 0) {
        context.font = 'bold 72px "Press Start 2P" '; // Larger font
        context.textAlign = 'center';
        
        // Make text color more vibrant and fade out
        const textAlpha = chainAnimation.timer / 120; // Use new timer duration
        context.fillStyle = `rgba(255, 255, 0, ${textAlpha})`; // Bright yellow
        context.strokeStyle = `rgba(255, 0, 0, ${textAlpha})`; // Red outline
        context.lineWidth = 8; // Thicker outline

        const x = canvas.width / 2, y = canvas.height / 2;
        // More dramatic scaling: start smaller, grow larger, then shrink
        const initialScale = 0.5;
        const maxScale = 2.0;
        const animationProgress = 1 - (chainAnimation.timer / 120); // 0 to 1
        let scale;
        if (animationProgress < 0.5) {
            // Grow phase
            scale = initialScale + (maxScale - initialScale) * (animationProgress * 2);
        } else {
            // Shrink phase
            scale = maxScale - (maxScale - initialScale) * ((animationProgress - 0.5) * 2);
        }
        
        context.save();
        context.translate(x, y);
        context.scale(scale, scale);
        context.shadowColor = `rgba(255, 255, 0, ${textAlpha})`; // Yellow glow
        context.shadowBlur = 20;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;

        context.strokeText(chainAnimation.text, 0, 0);
        context.fillText(chainAnimation.text, 0, 0);
        context.restore();
        chainAnimation.timer--;
    }
}

function drawGameOver() {
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'white';
    context.font = '40px sans-serif';
    context.textAlign = 'center';
    context.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
}

function updateStartScreenContent() {
    let highScoreTextElement = startScreen.querySelector('#high-score-display');
    if (!highScoreTextElement) {
        highScoreTextElement = document.createElement('p');
        highScoreTextElement.id = 'high-score-display';
        highScoreTextElement.style.fontSize = '24px';
        highScoreTextElement.style.marginTop = '20px';
        startScreen.querySelector('.overlay-text').appendChild(highScoreTextElement);
    }
    highScoreTextElement.textContent = `ハイスコア: ${highScore}`;
}

function updateOverlayVisibility() {
    // 全てのオーバーレイを一旦非表示にする
    startScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    restartButton.classList.add('hidden');

    // 現在のゲーム状態に応じて表示するオーバーレイを決定
    if (gameState === 'start') {
        startScreen.classList.remove('hidden');
        updateStartScreenContent(); // スタート画面の内容を更新
    } else if (gameState === 'paused') {
        pauseScreen.classList.remove('hidden');
    } else if (gameState === 'gameover') {
        restartButton.classList.remove('hidden');
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Event Listeners ---
restartButton.addEventListener('click', startGame);

document.addEventListener('keydown', (e) => {
    if (gameState === 'start' && e.key === 'Enter') {
        startGame();
        return;
    }
    if (e.key === 'p') {
        if (gameState === 'playing') {
            gameState = 'paused';
            // stopSound('bgm'); // ポーズ時にBGM停止
        } else if (gameState === 'paused') {
            gameState = 'playing
            // playSound('bgm'); // ポーズ解除時にBGM再開
        }
        updateOverlayVisibility(); // ポーズ状態変更時にオーバーレイを更新
        return;
    }
    if (gameState !== 'playing' || !currentPuyo) return;
    switch (e.key) {
        case 'ArrowLeft': if (!checkCollision(currentPuyo, -1, 0)) { currentPuyo.x--; currentPuyo.child.x--; } break;
        case 'ArrowRight': if (!checkCollision(currentPuyo, 1, 0)) { currentPuyo.x++; currentPuyo.child.x++; } break; // 修正: child.x も増やす
        case 'ArrowDown': dropInterval = 5; break;
        case 'ArrowUp':
            const nextRotation = (currentPuyo.rotation + 1) % 4;
            let nextChildX = currentPuyo.x, nextChildY = currentPuyo.y;
            // 親ぷよを基準とした子ぷよの相対位置を計算
            if (nextRotation === 0) { // 0度 (初期状態)
                nextChildX = currentPuyo.x;
                nextChildY = currentPuyo.y - 1;
            } else if (nextRotation === 1) { // 90度
                nextChildX = currentPuyo.x + 1;
                nextChildY = currentPuyo.y;
            } else if (nextRotation === 2) { // 180度
                nextChildX = currentPuyo.x;
                nextChildY = currentPuyo.y + 1;
            } else if (nextRotation === 3) { // 270度
                nextChildX = currentPuyo.x - 1;
                nextChildY = currentPuyo.y;
            }

            if (!checkCollision(currentPuyo, 0, 0, nextChildX, nextChildY)) {
                currentPuyo.child.x = nextChildX;
                currentPuyo.child.y = nextChildY;
                currentPuyo.rotation = nextRotation;
                // playSound('rotate');
            }
            break;
    }
});
document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowDown') dropInterval = 30;
});

document.addEventListener('DOMContentLoaded', () => {
    canvas.width = COLS * BLOCK_SIZE; canvas.height = ROWS * BLOCK_SIZE;
    nextCanvas.width = NEXT_BLOCK_SIZE * 2; nextCanvas.height = NEXT_BLOCK_SIZE * 2;
    loadHighScore();
    updateOverlayVisibility(); // 初期表示
    gameLoop(); // gameLoopを開始
});
