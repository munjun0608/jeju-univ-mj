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
// 실습: start 버튼 DOM 요소 추가
const startButton = document.getElementById('start');

// "start" 버튼 클릭 이벤트
startButton.addEventListener('click', () => {
  // 실습: 게임 시작 시 버튼 비활성화
  startButton.disabled = true;
  // 실습: 게임 재시작 시 입력창 활성화
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
  const currentWord = words[wordIndex];
  const typedValue = typedValueElement.value;

  // 1. 게임 완료 (마지막 단어까지 정확히 입력)
  if (typedValue === currentWord && wordIndex === words.length - 1) {
    const elapsedTime = new Date().getTime() - startTime;
    const message = `CONGRATULATIONS! You finished in ${elapsedTime / 1000} seconds.`;
    messageElement.innerText = message;

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

  // 3. 오타 발생
  } else if (currentWord.startsWith(typedValue)) {
    typedValueElement.className = '';
  // 4. 정상 타이핑 중
  } else {
    typedValueElement.className = 'error';
  }
});