document.addEventListener('DOMContentLoaded', () => {
  const factElement = document.getElementById('fact');
  const button = document.getElementById('getFact');

  button.addEventListener('click', fetchFact);
  fetchFact(); // 팝업 열릴 때도 바로 실행

  async function fetchFact() {
    factElement.textContent = "로딩 중...";

    try {
      // 0번 테스트에서 성공한 그 주소입니다.
      const response = await fetch('https://catfact.ninja/fact');
      if (!response.ok) {
        throw new Error('API 호출 실패');
      }
      const data = await response.json();

      // 이 API는 data.fact에 상식이 들어있습니다.
      factElement.textContent = data.fact;

    } catch (error) {
      console.error('오류:', error);
      factElement.textContent = '상식을 불러오는 데 실패했습니다.';
    }
  }
});