const posX = document.getElementById('pos-x');
const posY = document.getElementById('pos-y');
const visStatus = document.getElementById('vis-status');
const focusStatus = document.getElementById('focus-status');
const eventLog = document.getElementById('event-log');

function addLog(message) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'log-entry event-change';
    entry.textContent = `[${timeStr}] ${message}`;
    eventLog.prepend(entry);

    // Limit log size
    if (eventLog.childNodes.length > 50) {
        eventLog.removeChild(eventLog.lastChild);
    }
}

function updatePositions() {
    // screenX/screenY or screenLeft/screenTop
    const x = window.screenLeft ?? window.screenX;
    const y = window.screenTop ?? window.screenY;

    if (posX.textContent !== String(x) || posY.textContent !== String(y)) {
        posX.textContent = x;
        posY.textContent = y;
        // Minor visual feedback when position changes
        posX.parentElement.classList.add('updating');
        posY.parentElement.classList.add('updating');
        setTimeout(() => {
            posX.parentElement.classList.remove('updating');
            posY.parentElement.classList.remove('updating');
        }, 300);
    }

    requestAnimationFrame(updatePositions);
}

function updateVisibility() {
    const state = document.visibilityState;
    visStatus.textContent = state === 'visible' ? 'Visible' : 'Hidden / Minimized';

    if (state === 'visible') {
        visStatus.className = 'status-indicator status-active';
        addLog('페이지가 가시 상태가 되었습니다.');
    } else {
        visStatus.className = 'status-indicator status-inactive';
        addLog('페이지가 최소화되거나 가려졌습니다.');
    }
}

function updateFocus(isFocused) {
    focusStatus.textContent = isFocused ? 'Focused' : 'Blurred (Unfocused)';

    if (isFocused) {
        focusStatus.className = 'status-indicator status-active';
        addLog('창이 활성화되었습니다.');
    } else {
        focusStatus.className = 'status-indicator status-inactive';
        addLog('창이 포커스를 잃었습니다 (다른 창 선택됨).');
    }
}

// Initial state
updateVisibility();
updateFocus(document.hasFocus());

// Event Listeners
document.addEventListener('visibilitychange', updateVisibility);

window.addEventListener('focus', () => updateFocus(true));
window.addEventListener('blur', () => updateFocus(false));

// Start position monitoring loop
requestAnimationFrame(updatePositions);

addLog('실시간 모니터링 시작됨.');
