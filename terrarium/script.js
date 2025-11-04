/*
console.log(document.getElementById('plant1'));
dragElement(document.getElementById('plant1'));
dragElement(document.getElementById('plant2'));
dragElement(document.getElementById('plant3'));
dragElement(document.getElementById('plant4'));
dragElement(document.getElementById('plant5'));
dragElement(document.getElementById('plant6'));
dragElement(document.getElementById('plant7'));
dragElement(document.getElementById('plant8'));
dragElement(document.getElementById('plant9'));
dragElement(document.getElementById('plant10'));
dragElement(document.getElementById('plant11'));
dragElement(document.getElementById('plant12'));
dragElement(document.getElementById('plant13'));
dragElement(document.getElementById('plant14'));*/

// --- 과제 (Drag & Drop API) + 실습 (z-index) 통합 코드 (수정본) ---

let maxZIndex = 10;

const plants = document.querySelectorAll('.plant');
const terrarium = document.getElementById('terrarium');

let offsetX = 0;
let offsetY = 0;

plants.forEach(plant => {
    
    // (A) 과제: 드래그 시작
    plant.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', event.target.id);

        const plantRect = event.target.getBoundingClientRect();
        offsetX = event.clientX - plantRect.left;
        offsetY = event.clientY - plantRect.top;
        
        event.target.style.opacity = '0.5';

        // 실습 내용 적용: 드래그 시작 시 맨 앞으로
        bringToFront(event.target); 
    });

    // (B) 과제: 드래그 종료
    plant.addEventListener('dragend', (event) => {
        event.target.style.opacity = '1';
    });

    // (C) 실습: 더블클릭
    plant.addEventListener('dblclick', (event) => {
        bringToFront(event.target);
    });
});

// (D) 과제: 드롭 영역
terrarium.addEventListener('dragover', (event) => {
    event.preventDefault(); // 드롭 허용
});

// (E) 과제: 드롭 실행 (수정된 부분)
terrarium.addEventListener('drop', (event) => {
    event.preventDefault(); 

    const id = event.dataTransfer.getData('text/plain');
    const draggableElement = document.getElementById(id);

    // ✨ 1. (수정) 식물 요소를 화분(terrarium) 안으로 이동시킵니다.
    terrarium.appendChild(draggableElement);

    // ✨ 2. (수정) 스타일을 left/top으로 지정하기 위해 position을 설정합니다.
    draggableElement.style.position = 'absolute';

    const terrariumRect = terrarium.getBoundingClientRect();

    // 이제 화분(terrarium) 내부의 절대 위치로 계산됩니다.
    let newLeft = event.clientX - terrariumRect.left - offsetX;
    let newTop = event.clientY - terrariumRect.top - offsetY;

    draggableElement.style.left = newLeft + 'px';
    draggableElement.style.top = newTop + 'px';
});

// (F) 실습: z-index 변경 함수
function bringToFront(element) {
    maxZIndex++;
    element.style.zIndex = maxZIndex;
}