document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('game-board');
    const cardLayer = document.getElementById('card-layer');
    const handContainer = document.getElementById('hand-container');
    
    const rows = 4;
    const cols = 4;
    let gridSlots = [];
    let flatSlots = [];
    let counter = 1;

    // --- 1. 상태 및 게임 데이터베이스 (Database Schema) ---
    const CardDatabase = {
        "draka_01": {
            id: "draka_01",
            name: "Draka",
            type: "ENTITY",     
            image: "Card_draka.png",
            stats: { hp: 10, maxHp: 10, atk: 3 },
            description: "용맹한 드라카"
        },
        "tree_01": {
            id: "tree_01",
            name: "Ancient Tree",
            type: "OBSTACLE",   
            image: "Card_tree.png",
            stats: { hp: 20, maxHp: 20, atk: 0 },
            description: "길을 막는 고목나무"
        },
        "farm_01": {
            id: "farm_01",
            name: "Ancient Farmland",
            type: "OBSTACLE",   
            image: "Card_farm.png",
            stats: { hp: 15, maxHp: 15, atk: 0 },
            description: "신비한 기운이 감도는 고대 농지",
            // 턴 종료 시 주변 나무 체력 5 회복 스킬
            onTurnEnd: function(r, c, gridStore) {
                // 상, 하, 좌, 우 좌표
                const neighbors = [
                    { r: r - 1, c: c },
                    { r: r + 1, c: c },
                    { r: r, c: c - 1 },
                    { r: r, c: c + 1 }
                ];
                
                neighbors.forEach(n => {
                    // 보드판 경계(0~3) 안에 있는지 확인
                    if (n.r >= 0 && n.r < gridStore.length && n.c >= 0 && n.c < gridStore[0].length) {
                        const targetDOM = gridStore[n.r][n.c].currentCard;
                        // 주변 슬롯에 물리 카드가 존재하고, 그 데이터의 ID가 나무(tree_01)일 경우!
                        if (targetDOM && targetDOM.cardData.id === 'tree_01') {
                            
                            // 체력 스탯 조작 (이 예제에서는 제한 없이 계속 누적 성장이 가능하게 함)
                            targetDOM.cardData.stats.hp += 5;
                            
                            // UI(HP 뱃지) 즉시 업데이트 및 강렬한 시각적 피드백
                            if (targetDOM.hpEl) {
                                targetDOM.hpEl.textContent = targetDOM.cardData.stats.hp;
                                
                                // 녹색 빛 팝업 연출
                                targetDOM.hpEl.style.transition = 'all 0.15s ease';
                                targetDOM.hpEl.style.transform = 'scale(1.5)';
                                targetDOM.hpEl.style.color = '#7fff00'; // 형광 연두색
                                
                                setTimeout(() => {
                                    targetDOM.hpEl.style.transform = '';
                                    targetDOM.hpEl.style.color = 'white';
                                }, 300);
                            }
                        }
                    }
                });
            }
        }
    };

    // --- 2. 바닥에 그려지는 보드 슬롯(마커 자국) 생성 ---
    for (let r = 0; r < rows; r++) {
        let rowArray = [];
        for (let c = 0; c < cols; c++) {
            const slotEl = document.createElement('div');
            slotEl.classList.add('board-slot');
            slotEl.textContent = counter; 
            
            boardElement.appendChild(slotEl);
            
            let slotData = {
                id: counter,
                row: r,
                col: c,
                el: slotEl,
                currentCard: null 
            };
            rowArray.push(slotData);
            flatSlots.push(slotData);
            counter++;
        }
        gridSlots.push(rowArray);
    }
    
    // 글로벌 드래그 상태
    let draggedCard = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // --- 3. 데이터에 기반하여 물리적 카드를 렌더링하는 팩토리 함수 ---
    function renderCard(dbId, locationObj) {
        const template = CardDatabase[dbId];
        if (!template) return;

        // 원본 데이터를 파괴하거나 동일한 카드가 스탯을 공유하지 않도록 "깊은 복사(Clone)"
        const data = {
            ...template,
            stats: template.stats ? { ...template.stats } : null
        };

        const card = document.createElement('div');
        card.classList.add('physical-card');
        card.cardData = data;
        
        const img = document.createElement('img');
        img.src = data.image;
        img.alt = data.name;
        img.draggable = false;
        
        card.appendChild(img);

        // 스탯 오버레이 뱃지 부착
        if (data.stats) {
            if (data.stats.atk > 0 || data.type === 'ENTITY') {
                const atkBadge = document.createElement('div');
                atkBadge.className = 'stat-badge atk-badge';
                atkBadge.textContent = data.stats.atk;
                card.appendChild(atkBadge);
                card.atkEl = atkBadge;
            }
            
            const hpBadge = document.createElement('div');
            hpBadge.className = 'stat-badge hp-badge';
            hpBadge.textContent = data.stats.hp;
            card.appendChild(hpBadge);
            card.hpEl = hpBadge;
        }

        // 초기 위치 설정 (보드판 위 vs 손패)
        if (locationObj.type === 'hand') {
            card.classList.add('in-hand');
            card.currentSlot = { type: 'hand' };
            handContainer.appendChild(card);
        } else {
            cardLayer.appendChild(card);
            card.currentSlot = { type: 'board', r: locationObj.r, c: locationObj.c };
            // 보드판 생성이 완료된 후 스냅
            setTimeout(() => snapCardToSlot(card, locationObj.r, locationObj.c), 50);
        }
        
        // 마우스 상호작용 (드래그 시작)
        card.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // 좌클릭만 허용
            draggedCard = card;
            
            // 손패에 있는 카드라면, 드래그 시작 즉시 절대 좌표계(cardLayer)로 분리
            if (card.classList.contains('in-hand')) {
                const rect = card.getBoundingClientRect();
                card.classList.remove('in-hand');
                cardLayer.appendChild(card);
                
                // 3번 요청: 손패에서 벗어났을 때 회전값을 리셋하여 드래그 중에도 빳빳하게 만들기
                // 드래그하는 쾌감을 위해 살짝 확대된(scale) 상태 유지
                card.style.transform = 'scale(1.15)'; 
                
                card.style.left = rect.left + 'px';
                card.style.top = rect.top + 'px';
                
                dragOffsetX = e.clientX - rect.left;
                dragOffsetY = e.clientY - rect.top;
            } else {
                const rect = card.getBoundingClientRect();
                dragOffsetX = e.clientX - rect.left;
                dragOffsetY = e.clientY - rect.top;
                card.style.transform = 'scale(1.15)'; // 보드에서 들 때도 확대
            }
            
            document.querySelectorAll('.physical-card').forEach(c => c.style.zIndex = '50');
            card.style.zIndex = '1000';
            
            card.style.transition = 'transform 0.1s ease, box-shadow 0.1s ease';
        });

        return card;
    }

    // --- 4. 카드 스냅 및 상태 변경 로직 ---
    function snapCardToSlot(cardElement, row, col) {
        // 기존 자리에 있던 데이터 비우기 (손패에서 온게 아닐 경우)
        if (cardElement.currentSlot && cardElement.currentSlot.type === 'board') {
            const oldRow = cardElement.currentSlot.r;
            const oldCol = cardElement.currentSlot.c;
            gridSlots[oldRow][oldCol].currentCard = null;
        }

        cardElement.currentSlot = { type: 'board', r: row, c: col };
        gridSlots[row][col].currentCard = cardElement; // UI 업데이트를 위해 데이터가 아닌 물리 DOM 객체를 그대로 보드에 기록

        const slotEl = gridSlots[row][col].el;
        const rect = slotEl.getBoundingClientRect();
        
        const offX = (rect.width - cardElement.offsetWidth) / 2;
        const offY = (rect.height - cardElement.offsetHeight) / 2;
        
        cardElement.style.left = (rect.left + offX) + 'px';
        cardElement.style.top = (rect.top + offY) + 'px';
        
        slotEl.style.borderColor = '#ffffff';
        slotEl.style.textShadow = '0 0 10px rgba(255,255,255,0.5)';
        setTimeout(() => {
            slotEl.style.borderColor = '';
            slotEl.style.textShadow = '';
        }, 300);
    }

    function returnCardToHand(cardElement) {
        cardElement.classList.add('in-hand');
        cardElement.style.left = '';
        cardElement.style.top = '';
        cardElement.style.zIndex = '';
        cardElement.style.transform = ''; // 인핸드로 돌아갈 땐 빈값(옵저버가 관리)
        cardElement.currentSlot = { type: 'hand' };
        handContainer.appendChild(cardElement);
    }

    // --- 5. 드래그 앤 드롭 마스터 컨트롤러 ---
    document.addEventListener('mousemove', (e) => {
        if (!draggedCard) return;
        draggedCard.style.left = (e.clientX - dragOffsetX) + 'px';
        draggedCard.style.top = (e.clientY - dragOffsetY) + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (!draggedCard) return;
        
        const MathHypot = Math.hypot;
        const rect = draggedCard.getBoundingClientRect();
        const cardCenterX = rect.left + rect.width / 2;
        const cardCenterY = rect.top + rect.height / 2;
        
        let closestSlot = null;
        let minDistance = Infinity;

        for (let i = 0; i < flatSlots.length; i++) {
            const slotData = flatSlots[i];
            const sRect = slotData.el.getBoundingClientRect();
            const sCenterX = sRect.left + sRect.width / 2;
            const sCenterY = sRect.top + sRect.height / 2;
            
            const dist = MathHypot(cardCenterX - sCenterX, cardCenterY - sCenterY);
            if (dist < minDistance) {
                minDistance = dist;
                closestSlot = slotData;
            }
        }

        draggedCard.style.transition = ''; 
        
        // 거리가 180 이내이고 빈 칸일때 
        if (closestSlot && minDistance < 180 && !closestSlot.currentCard) {
            draggedCard.style.transform = ''; // 보드 안착 시 크기와 회전 원상복구
            snapCardToSlot(draggedCard, closestSlot.row, closestSlot.col);
        } else {
            if (draggedCard.currentSlot.type === 'hand') {
                returnCardToHand(draggedCard);
            } else {
                draggedCard.style.transform = ''; 
                snapCardToSlot(draggedCard, draggedCard.currentSlot.r, draggedCard.currentSlot.c);
            }
        }

        draggedCard = null;
    });

    // 리사이즈 시 자기 위치 복구
    window.addEventListener('resize', () => {
        const physicalCards = document.querySelectorAll('.physical-card:not(.in-hand)');
        physicalCards.forEach(card => {
            if (card.currentSlot && card.currentSlot.type === 'board') {
                card.style.transition = 'none';
                snapCardToSlot(card, card.currentSlot.r, card.currentSlot.c);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => card.style.transition = '');
                });
            }
        });
    });

    // 손패 (Hand) UI 둥글게(원호) 나열하는 부채꼴 자동 정렬 옵저버
    const handObserver = new MutationObserver(() => {
        const cardsInHand = Array.from(handContainer.querySelectorAll('.physical-card.in-hand'));
        const totalCards = cardsInHand.length;
        const maxAngle = 12; // 맨 끝 카드의 회전 최대 각도 제한
        const maxDrop = 15;  // 양 끝 카드가 아래로 처지는 정도 (px)
        
        cardsInHand.forEach((card, index) => {
            // 카드의 상대적 위치 계산 (-1 ~ 1, 즉 왼쪽 끝 ~ 오른쪽 끝)
            const pos = totalCards > 1 ? (index / (totalCards - 1)) * 2 - 1 : 0;
            const angle = pos * maxAngle;
            const yOffset = Math.abs(pos * pos) * maxDrop; 
            
            // 각 카드마다 고유한 회전과 처짐(Y Offset)을 인라인으로 강제 주입
            card.style.transform = `translateY(${yOffset}px) rotate(${angle}deg)`;
            card.style.zIndex = index + 100; // 오른쪽 카드가 위로 올라오게
        });
    });
    // 컨테이너 안에 카드가 들어오거나 나갈 때마다 자동으로 함수 실행
    handObserver.observe(handContainer, { childList: true });

    // --- 6. 초기 게임 시작 세팅 ---
    // 기존 보드판 위 카드
    renderCard('draka_01', { type: 'board', r: 1, c: 1 });
    renderCard('farm_01', { type: 'board', r: 2, c: 2 });
    
    // 손패(하단)에 나무 카드 5장 추가
    for (let i = 0; i < 5; i++) {
        renderCard('tree_01', { type: 'hand' });
    }

    // --- 7. 인터페이스 상호작용 (턴 종료 버튼 로직) ---
    const endTurnBtn = document.getElementById('end-turn-btn');
    if (endTurnBtn) {
        endTurnBtn.addEventListener('click', () => {
            console.log("=== 턴 종료 ===");
            
            // 모든 보드 슬롯 순회(루프)하며 각 카드의 onTurnEnd 효과 발동
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cardDOM = gridSlots[r][c].currentCard; // 현재 슬롯에 안착해 있는 DOM
                    
                    // DOM이 존재하고, 데이타에 onTurnEnd 함수가 선언되어 있다면 실행
                    if (cardDOM && cardDOM.cardData && typeof cardDOM.cardData.onTurnEnd === 'function') {
                        // 자기 자신의 좌표와 보드판 전체 데이터를 넘겨 처리
                        cardDOM.cardData.onTurnEnd(r, c, gridSlots);
                    }
                }
            }
        });
    }
});
