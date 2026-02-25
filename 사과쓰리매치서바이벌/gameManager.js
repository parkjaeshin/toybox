// 게임 매니저: 이벤트 리스너 및 전역 상태 관리
// 싱글톤 패턴으로 하나만 유지
const gridManager = new GridManager();

// 버튼 요소 가져오기
const btnAdd = document.getElementById('btn-add');
const btnClear = document.getElementById('btn-clear');

// 랜덤 오브젝트 추가 버튼 클릭 이벤트
btnAdd.addEventListener('click', () => {
    gridManager.addRandomObject();
});

// 모든 오브젝트 삭제 버튼 클릭 이벤트
btnClear.addEventListener('click', () => {
    gridManager.clearAllObjects();
});