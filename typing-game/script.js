// 인용문 배열
const quotes = [
  'When you have eliminated the impossible, whatever remains, however improbable, must be the truth.',
  'There is nothing more deceptive than an obvious fact.',
  'I ought to know by this time that when a fact appears to be opposed to a long train of deductions it invariably proves to be capable of bearing some other interpretation.',
  'I never make exceptions. An exception disproves the rule.',
  'What one man can invent another can discover.',
  'Nothing clears up a case so much as stating it to another person.',
  'Education never ends, Watson. It is a series of lessons, with the greatest for the last.',
];

// 초기값 세팅
let words = [];
let wordIndex = 0;
let startTime = Date.now();

// DOM 요소 가져오기
const quoteElement = document.getElementById('quote');
const messageElement = document.getElementById('message');
const typedValueElement = document.getElementById('typed-value');
const startButton = document.getElementById('start');

// (과제) 모달 DOM 요소 가져오기
const modal = document.getElementById('modal');
const modalOverlay = document.getElementById('modal-overlay');
const closeButton = document.getElementById('close-button');
const playAgainButton = document.getElementById('play-again-button');
const resultTimeElement = document.getElementById('result-time');
const highScoreElement = document.getElementById('high-score');


// "start" 버튼 클릭 이벤트
startButton.addEventListener('click', () => {
  // 실습: 게임 시작 시 버튼 비활성화
  startButton.disabled = true;
  // (실습 수정) 게임 시작 시 입력창 활성화
  typedValueElement.disabled = false;

  const quoteIndex = Math.floor(Math.random() * quotes.length);
  const quote = quotes[quoteIndex];
  words = quote.split(' ');
  wordIndex = 0;

  const spanWords = words.map(function(word) { return `<span>${word} </span>` });
  quoteElement.innerHTML = spanWords.join('');
  quoteElement.childNodes[0].className = 'highlight';
  messageElement.innerText = '';
  typedValueElement.value = '';
  typedValueElement.focus();
  startTime = new Date().getTime();
});

// input 필드의 입력 이벤트
typedValueElement.addEventListener('input', () => {
  // (실습 수정) 게임 시작 시에만 입력창 활성화 (시작 버튼 누르기 전 입력 방지)
  // -> startButton.click()에서 disabled=false로 처리하므로 이 코드는 필요 없음.
  // -> HTML에서 input에 disabled를 추가하여 초기 로드 시 비활성화

  const currentWord = words[wordIndex];
  const typedValue = typedValueElement.value;

  // 1. 게임 완료 (마지막 단어까지 정확히 입력)
  if (typedValue === currentWord && wordIndex === words.length - 1) {
    const elapsedTime = new Date().getTime() - startTime;
    
    // (과제) 메시지 대신 모달창 표시 함수 호출
    showModal(elapsedTime);

    // 실습: 게임 완료 시 텍스트 상자 비활성화 및 버튼 활성화
    typedValueElement.disabled = true;
    startButton.disabled = false;

  // 2. 단어 완료 (단어 입력 후 스페이스바)
  } else if (typedValue.endsWith(' ') && typedValue.trim() === currentWord) {
    typedValueElement.value = '';
    wordIndex++;
    // 하이라이트 제거
    for (const wordElement of quoteElement.childNodes) {
      wordElement.className = '';
    }
    // 다음 단어 하이라이트
    quoteElement.childNodes[wordIndex].className = 'highlight';

  // 3. 오타 발생 (순서 변경: 3. 정상 타이핑, 4. 오타)
  } else if (currentWord.startsWith(typedValue)) {
    // 3. 정상 타이핑 중
    typedValueElement.className = '';
  } else {
    // 4. 오타 발생
    typedValueElement.className = 'error';
  }
});


// --- (과제) 모달 관련 함수들 ---

/**
 * (과제) 게임 완료 시 모달을 표시하고 최고 점수를 처리하는 함수
 * @param {number} elapsedTime - 경과 시간 (ms)
 */
function showModal(elapsedTime) {
  const formattedTime = (elapsedTime / 1000).toFixed(2); // 초 단위
  resultTimeElement.innerText = `${formattedTime} seconds`;

  // (과제) localStorage로 최고 점수 관리
  // 저장된 점수(초)를 불러오되, 없으면 무한대(Infinity)로 설정
  const highScore = parseFloat(localStorage.getItem('highScore')) || Infinity;

  if (formattedTime < highScore) {
    // 신기록 달성
    localStorage.setItem('highScore', formattedTime);
    highScoreElement.innerText = `🏆 New High Score: ${formattedTime}s`;
  } else {
    // 기존 기록 표시
    highScoreElement.innerText = `High Score: ${highScore.toFixed(2)}s`;
  }

  // 모달 표시
  modal.classList.add('active');
  modalOverlay.classList.add('active');
}

/**
 * (과제) 모달과 오버레이를 숨기는 함수
 */
function hideModal() {
  modal.classList.remove('active');
  modalOverlay.classList.remove('active');
}

// 모달 닫기 버튼 이벤트
closeButton.addEventListener('click', hideModal);
// 오버레이 클릭 시 닫기 이벤트
modalOverlay.addEventListener('click', hideModal);

// (과제) 다시하기 버튼 이벤트
playAgainButton.addEventListener('click', () => {
  hideModal();
  startButton.click(); // 시작 버튼을 클릭하여 게임 재시작
});