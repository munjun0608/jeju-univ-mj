// // blackjack.js

// --- 플레이어 카드 설정 ---
let cardOne = 7;
let cardTwo = 5;
let cardThree = 7; // 플레이어가 추가로 받은 카드
let playerSum = cardOne + cardTwo + cardThree;

// --- 딜러(Bank) 카드 설정 ---
let cardOneBank = 7;
let cardTwoBank = 5;
// 딜러는 우선 2장의 카드로 시작합니다.
let bankSum = cardOneBank + cardTwoBank;

console.log(`You have: ${playerSum} points`);
console.log(`Bank has: ${bankSum} points`);
console.log('--------------------');

// 규칙 1 & 2: 플레이어가 21을 넘거나(Bust), 21점(블랙잭)일 경우 즉시 판정
if (playerSum > 21) {
  console.log('You busted! Bank wins.');
} else if (playerSum === 21) {
  console.log('Blackjack! You win!');
} else {
  // 규칙 3: 딜러는 카드 합이 17 이상이 될 때까지 카드를 뽑아야 함
  // 기존 코드의 cardThreeBank, cardFourBank를 추가 카드로 활용
  let cardThreeBank = 7;
  let cardFourBank = 4;

  while (bankSum < 17) {
    console.log(`Bank has ${bankSum}, needs to draw a new card.`);
    // 예시: 순서대로 3번째, 4번째 카드를 뽑는다고 가정
    if (bankSum + cardThreeBank < 17) {
        bankSum += cardThreeBank;
        bankSum += cardFourBank; // 이 예시에서는 17을 넘기 위해 두 장을 더함
    } else {
        bankSum += cardThreeBank;
    }
  }
  
  console.log(`Bank's final score is: ${bankSum}`);
  console.log('--------------------');

  // --- 최종 승패 판정 ---
  // 규칙 5: 딜러가 21을 초과하면 플레이어의 승리
  if (bankSum > 21) {
    console.log('Bank busted! You win!');
  } 
  // 규칙 4: 카드 합이 같으면 무승부
  else if (playerSum === bankSum) {
    console.log('Draw!');
  } 
  // 21에 더 가까운 쪽이 승리
  else if (playerSum > bankSum) {
    console.log('You win!');
  } else {
    console.log('Bank wins!');
  }
} //수정