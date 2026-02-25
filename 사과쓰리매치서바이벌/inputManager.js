// 사용자 입력(마우스 드래그)을 전담하여 관리
function InputManager() {
    // 드래그 상태 관리
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    // 시각적 드래그 박스 DOM 요소
    let dragBoxElement = null;
    let gridElement = null; // 이벤트의 기준이 될 게임 보드
    let selectionBoxElement = null; // UI에 보여줄 리스트 컨테이너

    // 드래그된 아이템들을 담을 임시 리스트
    let selectedItemsList = [];

    // 초기화: 이벤트 리스너 등록
    function init() {
        gridElement = document.getElementById('grid');
        selectionBoxElement = document.getElementById('selection-items-box');
        if (!gridElement) return;

        // 드래그 박스 UI 요소 생성 (DOM에는 드래그 시작 시 추가됨)
        dragBoxElement = document.createElement('div');
        dragBoxElement.id = 'drag-box';

        // 그리드 내에서만 드래그 동작하도록 이벤트 할당 (화면 전체 캡처를 위해 document도 활용)
        gridElement.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // 터치 디바이스 지원 (모바일 고려 시)
        gridElement.addEventListener('touchstart', (e) => onMouseDown(e.touches[0]));
        document.addEventListener('touchmove', (e) => onMouseMove(e.touches[0]));
        document.addEventListener('touchend', onMouseUp);
    }

    function onMouseDown(e) {
        if (!gridElement) return;

        // 기본 드래그(텍스트 선택 등) 방지
        e.preventDefault && e.preventDefault();

        isDragging = true;
        selectedItemsList = []; // 새로운 드래그 시작 시 리스트 초기화

        // 요소의 화면 기준 위치 계산
        const rect = gridElement.getBoundingClientRect();

        // gridElement 내부 기준(상대 좌표)으로 시작점 저장
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;

        // 시각적 박스 초기화 및 표시
        updateDragBoxStyles(startX, startY, 0, 0);
        gridElement.appendChild(dragBoxElement);
    }

    function onMouseMove(e) {
        if (!isDragging) return;

        const rect = gridElement.getBoundingClientRect();

        // 현재 마우스 위치 (그리드 내부 상대 좌표)
        // 그리드 영역을 벗어난 드래그도 부드럽게 처리하기 위해 제한(clamp) 처리
        let currentX = e.clientX - rect.left;
        let currentY = e.clientY - rect.top;

        // 그리드 경계 내로 제한
        currentX = Math.max(0, Math.min(currentX, rect.width));
        currentY = Math.max(0, Math.min(currentY, rect.height));

        // 박스의 좌상단 모서리(left, top)와 크기(width, height) 계산
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        updateDragBoxStyles(left, top, width, height);

        // 실시간으로 박스와 충돌(포함)된 아이템들 검사
        checkOverlappingItems(left, top, width, height);
    }

    function onMouseUp(e) {
        if (!isDragging) return;
        isDragging = false;

        // UI에서 드래그 박스 제거
        if (dragBoxElement && dragBoxElement.parentNode) {
            dragBoxElement.parentNode.removeChild(dragBoxElement);
        }

        console.log("드래그 완료! 최종 선택된 아이템 개수:", selectedItemsList.length);

        // --- 1. 최종 합계 점수 검사 ---
        let totalScore = 0;
        selectedItemsList.forEach(itemEl => {
            const row = parseInt(itemEl.dataset.row);
            const col = parseInt(itemEl.dataset.col);
            const obj = objArr[row][col];
            if (obj && typeof obj.score === 'number') {
                totalScore += obj.score;
            }
        });

        // 10점 달성 여부 체크
        if (totalScore === 10) {
            console.log("합계 10점 달성! 아이템을 삭제합니다.");
            // gameManager에서 선언한 전역 변수 gridManager 의 삭제 함수 호출
            if (typeof gridManager !== 'undefined') {
                gridManager.removeItems(selectedItemsList);
            }
        }

        //더 많은 조건을 추가하고, 유저가 여러 전략을 선택하도록 만들 계획

        // --- 2. 드래그가 끝나면 임시 리스트 비우고, 시각적 피드백 중지 ---
        // 생성된 시각적 피드백을 모두 원래대로 복구 
        // (단, 10점 달성으로 이미 삭제되었다면 DOM에서 사라졌으므로 안전하게 무시됨)
        selectedItemsList.forEach(itemEl => {
            if (itemEl.parentNode) {
                itemEl.style.opacity = '1';
                itemEl.style.transform = 'scale(1)';
            }
        });

        // 배열 초기화 및 우측 UI 리스트도 빈 상태로 다시 렌더링
        selectedItemsList = [];
        renderSelectionList();
    }

    // 드래그 박스 CSS 스타일 업데이트 헬퍼
    function updateDragBoxStyles(left, top, width, height) {
        dragBoxElement.style.left = `${left}px`;
        dragBoxElement.style.top = `${top}px`;
        dragBoxElement.style.width = `${width}px`;
        dragBoxElement.style.height = `${height}px`;
    }

    // 드래그 박스 영역(AABB)과 아이템 영역들이 겹치는지 검사하여 리스트에 추가
    function checkOverlappingItems(boxLeft, boxTop, boxWidth, boxHeight) {
        // 박스의 우하단 좌표 계산
        const boxRight = boxLeft + boxWidth;
        const boxBottom = boxTop + boxHeight;

        // 매번 초기화하고 완전히 포함된 것만 찾을지, 스치기만 해도 담을지에 따라 구현.
        // 여기선 현재 박스 안에 닿은 것들을 매 프레임 재계산하여 리스트를 최신화함.
        const currentIntersects = [];

        // 렌더링된 모든 아이템 요소 순회
        const itemElements = gridElement.querySelectorAll('.item-wrapper');

        itemElements.forEach(itemEl => {
            // offsetLeft/Top 은 gridElement 기준으로 계산된 상대 위치임
            const itemLeft = itemEl.offsetLeft;
            const itemTop = itemEl.offsetTop;
            const itemRight = itemLeft + itemEl.offsetWidth;
            const itemBottom = itemTop + itemEl.offsetHeight;

            // AABB(Axis-Aligned Bounding Box) 충돌(겹침) 판별 로직
            const isColliding = !(boxRight < itemLeft ||
                boxLeft > itemRight ||
                boxBottom < itemTop ||
                boxTop > itemBottom);

            if (isColliding) {
                // 시각적 피드백 효과 (예: 약간 불투명하게)
                itemEl.style.opacity = '0.7';
                itemEl.style.transform = 'scale(0.9)';
                currentIntersects.push(itemEl);
            } else {
                // 벗어난 요소는 원래대로 복구
                itemEl.style.opacity = '1';
                itemEl.style.transform = 'scale(1)';
            }
        });

        selectedItemsList = currentIntersects;

        // --- [요청사항 추가] 실시간 임시 리스트 UI 렌더링 ---
        renderSelectionList();
    }

    // 선택된 아이템 배열을 기반으로 우측 UI 컨트롤 패널에 썸네일을 렌더링하는 함수
    function renderSelectionList() {
        if (!selectionBoxElement) return;

        // 기존 렌더링 초기화
        selectionBoxElement.innerHTML = '';

        let totalScore = 0;

        selectedItemsList.forEach(itemEl => {
            // 데이터셋에서 위치를 가져와 전역 objArr에서 점수 합산
            const row = parseInt(itemEl.dataset.row);
            const col = parseInt(itemEl.dataset.col);
            const obj = objArr[row][col];
            if (obj && typeof obj.score === 'number') {
                totalScore += obj.score;
            }

            // 원본 요소에서 이미지 src 추출
            const typeImgSrc = itemEl.querySelector('.item-type-img').src;
            const scoreImgSrc = itemEl.querySelector('.item-score-img').src;

            // 썸네일 컨테이너 생성
            const thumbDiv = document.createElement('div');
            thumbDiv.classList.add('selection-thumb');

            // 속성(배경) 이미지
            const typeImg = document.createElement('img');
            typeImg.src = typeImgSrc;
            typeImg.classList.add('thumb-type');

            // 숫자(전경) 이미지
            const scoreImg = document.createElement('img');
            scoreImg.src = scoreImgSrc;
            scoreImg.classList.add('thumb-score');

            thumbDiv.appendChild(typeImg);
            thumbDiv.appendChild(scoreImg);

            selectionBoxElement.appendChild(thumbDiv);
        });

        // 점수 UI 업데이트
        const scoreSpan = document.getElementById('selection-score-total');
        if (scoreSpan) {
            scoreSpan.innerText = `(합계: ${totalScore})`;
        }
    }

    // 초기화 실행
    // HTML이 모두 로드된 후 실행하기 위해 설정(js 파일 로딩 시점에 주의)
    document.addEventListener('DOMContentLoaded', init);

    // 외부로 노출할 인터페이스들 (필요하다면)
    return {
        getSelectedItems: () => selectedItemsList
    }
}

// 싱글톤으로 인스턴스화
const inputManager = new InputManager();
