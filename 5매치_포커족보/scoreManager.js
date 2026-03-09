// 점수 및 포커 족보 판별을 전담하는 매니저
const ScoreManager = (function () {

    // 화면 중앙에 텍스트 파티클을 띄워서 위로 사라지게 하는 시각적 효과
    function showTextEffect(text, scoreEarned) {
        const gameArea = document.querySelector('.game-area');
        if (!gameArea) return;

        const effectDiv = document.createElement('div');
        effectDiv.className = 'combo-text-effect';
        effectDiv.innerHTML = `
            <div class="combo-title">${text}</div>
            <div class="combo-score">+${scoreEarned}</div>
        `;

        // 애니메이션이 끝나면 DOM에서 자동 제거
        effectDiv.addEventListener('animationend', () => {
            effectDiv.remove();
        });

        gameArea.appendChild(effectDiv);
    }

    // 선택된 아이템 배열을 받아 족보를 판별하고 점수를 반환
    function evaluate(selectedItemsList) {
        if (!selectedItemsList || selectedItemsList.length !== 5) {
            return { score: 0, text: "" };
        }

        // 아이템의 type(속성) 데이터 추출
        const types = selectedItemsList.map(itemEl => {
            const row = parseInt(itemEl.dataset.row);
            const col = parseInt(itemEl.dataset.col);
            const obj = objArr[row][col];
            return obj ? obj.type : null;
        });

        // 모든 아이템이 같은 속성인지 판별 (플러시 조건)
        const firstType = types[0];
        const isFlush = types.every(type => type !== null && type === firstType);

        let finalScore = 0;
        let comboText = "";

        if (isFlush) {
            finalScore = 5000;
            comboText = "플러시!";
        } else {
            finalScore = 500;
            comboText = "하이 카드!";
        }

        // 시각적 피드백 표시
        showTextEffect(comboText, finalScore);

        return { score: finalScore, text: comboText };
    }

    return {
        evaluate
    };
})();
