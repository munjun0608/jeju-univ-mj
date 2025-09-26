let iceCreamFlavors = [
 { name: "Chocolate", type: "Chocolate", price: 2 },
 { name: "Strawberry", type: "Fruit", price: 1 },
 { name: "Vanilla", type: "Vanilla", price: 2 },
 { name: "Pistachio", type: "Nuts", price: 1.5 },
 { name: "Neapolitan", type: "Chocolate", price: 2},
 { name: "Mint Chip", type: "Chocolate", price: 1.5 },
 { name: "Raspberry", type: "Fruit", price: 1},
];

// { scoops: [], total: }
let transactions = []
// { scoops: [], total: }
transactions.push({ scoops: ["Chocolate", "Vanilla", "Mint Chip"], total: 5.5 })
transactions.push({ scoops: ["Raspberry", "StrawBerry"], total: 2 })
transactions.push({ scoops: ["Vanilla", "Vanilla"], total: 4 })

// 수익 계산
const total = transactions.reduce((acc, curr) => acc + curr.total, 0);
console.log(`You've made ${total} $ today`); // You've made 11.5 $ toda
// 각 맛의 판매량
let flavorDistribution = transactions.reduce((acc, curr) => {
 curr.scoops.forEach(scoop => {
 if (!acc[scoop]) {
 acc[scoop] = 0;
 }
 acc[scoop]++;
 })
 return acc;
}, {}) // { Chocolate: 1, Vanilla: 3, Mint Chip: 1, Raspberry: 1, StrawBerry: 1 }
console.log(flavorDistribution);

let bestSellingFlavor = '';
let highestCount = 0;

const flavors = Object.keys(flavorDistribution);

// 각 맛을 순회하며 판매량을 비교합니다.
flavors.forEach(flavor => {
  // 현재 맛의 판매량이 기록된 최고 판매량보다 높으면
  if (flavorDistribution[flavor] > highestCount) {
    // 최고 판매량과 맛의 이름을 새로 업데이트합니다.
    highestCount = flavorDistribution[flavor];
    bestSellingFlavor = flavor;
  }
});

console.log(`\n🏆 Today's best-selling flavor is ${bestSellingFlavor} with ${highestCount} scoops!`); //수정2
