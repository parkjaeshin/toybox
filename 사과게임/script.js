const cols = 17;
const rows = 10;
const board = document.getElementById('game-board');
const apples = [];

function createApple(value) {
    const appleDiv = document.createElement('div');
    appleDiv.className = 'apple';

    appleDiv.innerHTML = `
        <svg class="apple-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="#ff4d4d" />
            <path d="M50 15 L50 5" stroke="#2ecc71" stroke-width="8" stroke-linecap="round" />
        </svg>
        <span>${value}</span>
    `;

    return appleDiv;
}

let isDragging = false;
let startPos = { x: 0, y: 0 };
let currentPos = { x: 0, y: 0 };
let currentTotal = 0;
let score = 0;
let timeLeft = 120; // 120 seconds
let timerInterval;
let isPaused = false;
let gameStarted = false;

const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const overlay = document.getElementById('game-overlay');

function initGame() {
    board.innerHTML = '';
    apples.length = 0;
    score = 0;
    timeLeft = 120;
    currentTotal = 0;
    gameStarted = false;
    isPaused = false;

    updateScore();
    sumDisplay.textContent = 0;

    if (timerInterval) clearInterval(timerInterval);
    document.getElementById('timer-bar').style.width = '100%';

    overlay.classList.remove('hidden');
    startBtn.textContent = '게임 시작';
    pauseBtn.disabled = true;
    pauseBtn.textContent = '일시 정지';

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            // ... existing loop
            const randomValue = Math.floor(Math.random() * 9) + 1;
            const appleElement = createApple(randomValue);
            board.appendChild(appleElement);
            // Store both element and its value
            apples.push({
                element: appleElement,
                value: randomValue,
                removed: false
            });
        }
    }
}

const dragBox = document.getElementById('drag-box');

window.addEventListener('mousedown', (e) => {
    if (!gameStarted || isPaused) return;
    isDragging = true;
    startPos = { x: e.clientX, y: e.clientY };
    currentPos = { x: e.clientX, y: e.clientY };

    dragBox.style.display = 'block';
    updateDragBox();
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging || !gameStarted || isPaused) return;
    currentPos = { x: e.clientX, y: e.clientY };
    updateDragBox();
});

const sumDisplay = document.getElementById('total-sum');

window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    dragBox.style.display = 'none';

    // Remove if sum is 10
    if (currentTotal === 10) {
        const selectedApples = apples.filter(apple =>
            !apple.removed && apple.element.classList.contains('highlighted')
        );
        if (selectedApples.length > 0) {
            removeApples(selectedApples);
        }
    }

    // Clear highlights and reset sum display
    apples.forEach(apple => {
        apple.element.classList.remove('highlighted');
    });
    currentTotal = 0;
    sumDisplay.textContent = 0;
});

startBtn.addEventListener('click', () => {
    if (!gameStarted) {
        gameStarted = true;
        overlay.classList.add('hidden');
        pauseBtn.disabled = false;
        startTimer();
    } else if (isPaused) {
        resumeGame();
    }
});

pauseBtn.addEventListener('click', () => {
    if (isPaused) {
        resumeGame();
    } else {
        pauseGame();
    }
});

restartBtn.addEventListener('click', () => {
    initGame();
});

function pauseGame() {
    isPaused = true;
    clearInterval(timerInterval);
    overlay.classList.remove('hidden');
    startBtn.textContent = '계속 하기';
    pauseBtn.textContent = '재개 하기';
}

function resumeGame() {
    isPaused = false;
    overlay.classList.add('hidden');
    pauseBtn.textContent = '일시 정지';
    startTimer();
}

function updateDragBox() {
    const left = Math.min(startPos.x, currentPos.x);
    const top = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    dragBox.style.left = `${left}px`;
    dragBox.style.top = `${top}px`;
    dragBox.style.width = `${width}px`;
    dragBox.style.height = `${height}px`;

    checkCollision(left, top, width, height);
}

function checkCollision(boxLeft, boxTop, boxWidth, boxHeight) {
    const boxRight = boxLeft + boxWidth;
    const boxBottom = boxTop + boxHeight;
    let sum = 0;

    apples.forEach(apple => {
        if (apple.removed) return;
        const rect = apple.element.getBoundingClientRect();

        // Accurate overlap check
        const overlaps = !(rect.right < boxLeft ||
            rect.left > boxRight ||
            rect.bottom < boxTop ||
            rect.top > boxBottom);

        if (overlaps) {
            apple.element.classList.add('highlighted');
            sum += apple.value;
        } else {
            apple.element.classList.remove('highlighted');
        }
    });

    currentTotal = sum;
    sumDisplay.textContent = currentTotal;
}

function removeApples(selectedApples) {
    selectedApples.forEach(apple => {
        apple.removed = true;
        animateAppleFall(apple.element);
    });
    score += selectedApples.length; // Increment score by the number of apples removed
    updateScore();
}

function updateScore() {
    document.getElementById('game-score').textContent = score;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    const timerBar = document.getElementById('timer-bar');

    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        const percentage = (timeLeft / 120) * 100;
        timerBar.style.width = `${percentage}%`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert(`게임 종료! 최종 점수: ${score}`);
            initGame(); // Auto restart
        }
    }, 100);
}

function animateAppleFall(el) {
    const rect = el.getBoundingClientRect();
    const startX = rect.left;
    const startY = rect.top;

    // Copy element for free-form animation
    const clone = el.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.left = `${startX}px`;
    clone.style.top = `${startY}px`;
    clone.style.margin = '0';
    clone.style.zIndex = '2000';
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);

    // Hide original
    el.style.visibility = 'hidden';

    // Parabolic constants
    const vx = (Math.random() - 0.5) * 10; // Random horizontal speed
    let vy = -10 - Math.random() * 5;      // Initial upward boost
    const gravity = 0.8;

    let currentX = startX;
    let currentY = startY;
    let opacity = 1;

    function frame() {
        currentX += vx;
        currentY += vy;
        vy += gravity;
        opacity -= 0.02;

        clone.style.transform = `translate(${currentX - startX}px, ${currentY - startY}px) rotate(${currentX}deg)`;
        clone.style.opacity = opacity;

        if (opacity > 0) {
            requestAnimationFrame(frame);
        } else {
            clone.remove();
        }
    }

    requestAnimationFrame(frame);
}

window.onload = initGame;
