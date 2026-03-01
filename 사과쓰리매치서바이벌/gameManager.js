// 게임 매니저: 이벤트 리스너 및 전역 상태 관리
// 싱글톤 패턴으로 하나만 유지
const gridManager = new GridManager();

// 전역 게임 상태
window.isGameRunning = false;
window.isPaused = false;
let totalScore = 0;

// 타이머 변수
const MAX_TIME = 60; // 60초
let timeRemaining = MAX_TIME;
let timerInterval = null;

// DOM 요소
const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const timerBar = document.getElementById('timer-bar');

// 초기화: 게임 화면이 로드되면 먼저 랜덤 오브젝트를 꽉 채워둠
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        gridManager.addRandomObject();
    }, 100);
});

// 게임 시작 버튼 이벤트
btnStart.addEventListener('click', () => {
    startGame();
});

// 일시정지 버튼 이벤트
btnPause.addEventListener('click', () => {
    if (!window.isGameRunning) return;
    togglePause();
});

function startGame() {
    window.isGameRunning = true;
    startScreen.style.display = 'none';
    btnPause.disabled = false;

    // 타이머 시작
    timeRemaining = MAX_TIME;
    updateTimerUI();

    resumeTimer();
}

function resumeTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeRemaining -= 0.1; // 0.1초씩 감소
        updateTimerUI();

        if (timeRemaining <= 0) {
            endGame();
        }
    }, 100);
}

function togglePause() {
    window.isPaused = !window.isPaused;

    if (window.isPaused) {
        pauseScreen.style.display = 'flex';
        btnPause.innerText = '계속하기';

        // 타이머 확실히 중지
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        // 혹시라도 발생 중인 드래그 이벤트를 강제 취소
        if (typeof inputManager !== 'undefined' && inputManager.forceCancelDrag) {
            inputManager.forceCancelDrag();
        }
    } else {
        pauseScreen.style.display = 'none';
        btnPause.innerText = '일시정지';

        // 타이머 재개
        resumeTimer();
    }
}

function endGame() {
    window.isGameRunning = false;
    clearInterval(timerInterval);
    btnPause.disabled = true;

    // 게임 오버 처리
    setTimeout(() => {
        alert(`게임 오버! 최종 점수: ${totalScore}`);
        location.reload();
    }, 100);
}

function updateTimerUI() {
    const percentage = (timeRemaining / MAX_TIME) * 100;

    // 음수가 되지 않도록 방어
    const safePercentage = Math.max(0, percentage);
    timerBar.style.width = `${safePercentage}%`;

    // 색상 변경 로직
    if (safePercentage <= 20) {
        timerBar.className = 'timer-bar danger';
    } else if (safePercentage <= 50) {
        timerBar.className = 'timer-bar warning';
    } else {
        timerBar.className = 'timer-bar';
    }
}