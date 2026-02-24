// ──────────────────────────────────────────
// 카드 데이터
// ──────────────────────────────────────────
const MENU_DATA = [
    {
        image: 'assets/food_card.png',
        name: '프리미엄 비빔밥',
        desc: '신선한 채소와 고소한 나물의 조화',
        detail: '전통적인 한국의 맛을 현대적으로 재해석했습니다.'
    },
    {
        image: 'assets/food_card_bulgogi.png',
        name: '불고기',
        desc: '달콤하고 짭조름한 소고기 구이',
        detail: '부드러운 소고기와 은은한 양념의 만남.'
    },
    {
        image: 'assets/food_card.png',
        name: '된장찌개',
        desc: '구수하고 깊은 한국의 국물 요리',
        detail: '오랜 시간 숙성된 된장으로 끓인 정통 찌개.'
    },
    {
        image: 'assets/food_card_bulgogi.png',
        name: '삼겹살',
        desc: '노릇하게 구운 돼지 삼겹살',
        detail: '겉은 바삭, 속은 촉촉. 상추에 싸서 먹으면 최고!'
    },
];

// ──────────────────────────────────────────
// 상태
// ──────────────────────────────────────────
const wrapper = document.getElementById('cardWrapper');
let cards = [];          // DOM 카드 배열 (0번이 맨 위)
let isDragging = false;
let startX, startY;
let currentX = 0, currentY = 0;
let rotation = 0;

// ──────────────────────────────────────────
// 카드 DOM 생성
// ──────────────────────────────────────────
function createCardEl(data) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div class="card-inner">
            <div class="card-front">
                <div class="card-image" style="background-image: url('${data.image}');"></div>
                <div class="card-content">
                    <h2 class="food-name">${data.name}</h2>
                    <p class="food-desc">${data.desc}</p>
                </div>
            </div>
            <div class="card-back">
                <div class="back-content">
                    <h3>Menu Detail</h3>
                    <p>${data.detail}</p>
                </div>
            </div>
        </div>`;
    return card;
}

// ──────────────────────────────────────────
// 스택 초기화
// ──────────────────────────────────────────
function initStack() {
    wrapper.innerHTML = '';
    cards = [];

    // 역순으로 추가해야 맨 첫 번째 카드가 DOM에서 제일 위(z-index 높음)에 오게 됨
    [...MENU_DATA].reverse().forEach((data, i) => {
        const el = createCardEl(data);
        wrapper.appendChild(el);
        cards.unshift(el); // 0번 인덱스가 맨 위 카드
    });

    updateStackVisuals();
    bindTopCard();
}

// ──────────────────────────────────────────
// 스택 시각 업데이트 (z-index + data-stack)
// ──────────────────────────────────────────
function updateStackVisuals() {
    cards.forEach((card, i) => {
        // 0 = 맨 위 (가장 높은 z-index)
        card.style.zIndex = cards.length - i;
        card.removeAttribute('data-stack');
        if (i > 0) card.setAttribute('data-stack', Math.min(i, 3));
    });
}

// ──────────────────────────────────────────
// 맨 위 카드에 이벤트 바인딩
// ──────────────────────────────────────────
function bindTopCard() {
    if (cards.length === 0) {
        showAllGoneMessage();
        return;
    }

    const card = cards[0];

    // 상태 초기화
    isDragging = false;
    currentX = 0;
    currentY = 0;
    rotation = 0;

    // Parallax
    wrapper.addEventListener('mousemove', onMouseMove);
    wrapper.addEventListener('mouseleave', onMouseLeave);

    // Drag
    card.addEventListener('pointerdown', onPointerDown);
    card.addEventListener('pointermove', onPointerMove);
    card.addEventListener('pointerup', onPointerUp);

    // Flip
    card.addEventListener('click', onCardClick);
}

// ──────────────────────────────────────────
// Parallax 핸들러
// ──────────────────────────────────────────
function onMouseMove(e) {
    const card = cards[0];
    if (!card) return;
    if (isDragging || card.classList.contains('flipped') || card.classList.contains('thrown')) return;

    const { clientX, clientY } = e;
    const { left, top, width, height } = wrapper.getBoundingClientRect();

    const x = (clientX - left) - width / 2;
    const y = (clientY - top) - height / 2;

    const rotateX = (-y / height) * 30;
    const rotateY = (x / width) * 30;

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
}

function onMouseLeave() {
    const card = cards[0];
    if (!card) return;
    if (isDragging || card.classList.contains('flipped') || card.classList.contains('thrown')) return;
    card.style.transform = `rotateX(0deg) rotateY(0deg)`;
}

// ──────────────────────────────────────────
// Drag 핸들러
// ──────────────────────────────────────────
function onPointerDown(e) {
    const card = cards[0];
    if (card.classList.contains('thrown')) return;
    if (e.target.closest('.draw-btn')) return;

    isDragging = true;
    startX = e.clientX - currentX;
    startY = e.clientY - currentY;

    card.classList.add('dragging');
    card.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
    if (!isDragging) return;
    const card = cards[0];

    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
    rotation = currentX * 0.1;

    card.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotation}deg)`;

    if (Math.abs(currentX) > 10 || Math.abs(currentY) > 10) {
        card.style.pointerEvents = 'none';
    }
}

function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    const card = cards[0];
    card.classList.remove('dragging');
    card.style.pointerEvents = 'auto';

    const threshold = 150;
    const absX = Math.abs(currentX);
    const absY = Math.abs(currentY);

    if (absX > threshold || absY > threshold) {
        throwCard(card);
    } else {
        // Snap back
        currentX = 0;
        currentY = 0;
        rotation = 0;
        card.style.transform = `translate(0, 0) rotate(0deg)`;
    }
}

function throwCard(card) {
    // 현재 top 카드의 이벤트 리스너 제거
    removeTopCardListeners(card);

    card.classList.add('thrown');
    card.style.setProperty('--exit-x', `${currentX}px`);
    card.style.setProperty('--exit-y', `${currentY}px`);
    card.style.setProperty('--exit-rotate', `${rotation}deg`);

    setTimeout(() => {
        card.remove();
        cards.shift(); // 배열에서도 제거

        // 3장 이하로 줄면 3장 보충
        if (cards.length <= 3) {
            refillStack(3);
        }

        updateStackVisuals();

        // 다음 카드 진입 애니메이션
        if (cards.length > 0) {
            const next = cards[0];
            next.style.transition = 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), filter 0.4s ease';
            next.removeAttribute('data-stack');
            setTimeout(() => {
                next.style.transition = '';
                bindTopCard();
            }, 100);
        } else {
            showAllGoneMessage();
        }
    }, 400);
}

// ──────────────────────────────────────────
// 스택 보충 (맨 아래에 카드 추가)
// ──────────────────────────────────────────
function refillStack(count) {
    // MENU_DATA를 셔플해서 count장 뽑기
    const shuffled = [...MENU_DATA].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, count);

    picks.forEach(data => {
        const el = createCardEl(data);
        // 맨 아래(DOM에서 가장 먼저, z-index 낮음)에 삽입
        wrapper.insertBefore(el, wrapper.firstChild);
        cards.push(el); // 배열 맨 뒤 = 스택 맨 아래
    });
}


// ──────────────────────────────────────────
// 이벤트 리스너 제거 (top 카드 교체 시)
// ──────────────────────────────────────────
function removeTopCardListeners(card) {
    wrapper.removeEventListener('mousemove', onMouseMove);
    wrapper.removeEventListener('mouseleave', onMouseLeave);
    card.removeEventListener('pointerdown', onPointerDown);
    card.removeEventListener('pointermove', onPointerMove);
    card.removeEventListener('pointerup', onPointerUp);
    card.removeEventListener('click', onCardClick);
}

// ──────────────────────────────────────────
// 카드 뒤집기
// ──────────────────────────────────────────
function onCardClick(e) {
    if (Math.abs(currentX) > 5 || Math.abs(currentY) > 5) return;
    const card = cards[0];
    if (card.classList.contains('thrown')) return;
    card.classList.toggle('flipped');
}


// ──────────────────────────────────────────
// 시작
// ──────────────────────────────────────────
initStack();
