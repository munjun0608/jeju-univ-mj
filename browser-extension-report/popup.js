document.addEventListener('DOMContentLoaded', () => {
  const factElement = document.getElementById('fact');
  const imageElement = document.getElementById('catImage');
  const getFactButton = document.getElementById('getFact');
  const historyListElement = document.getElementById('historyList');
  const clearHistoryButton = document.getElementById('clearHistory');

  // --- 이벤트 리스너 ---
  getFactButton.addEventListener('click', fetchNewFactAndImage);
  clearHistoryButton.addEventListener('click', clearHistory);

  // --- 초기 실행 ---
  loadHistory();
  fetchNewFactAndImage(); // 팝업 열릴 때도 바로 실행

  // --- 핵심 기능 함수 ---

  /**
   * 새로운 고양이 상식과 이미지를 API로부터 가져옵니다.
   */
  async function fetchNewFactAndImage() {
    setLoading(true);

    try {
      // 두 개의 API를 동시에 호출 (Promise.all)
      const [factResponse, imageResponse] = await Promise.all([
        fetch('https://catfact.ninja/fact'),
        fetch('https://api.thecatapi.com/v1/images/search')
      ]);

      if (!factResponse.ok || !imageResponse.ok) {
        throw new Error('API 호출 실패');
      }

      const factData = await factResponse.json();
      const imageData = await imageResponse.json();

      const fact = factData.fact;
      const imageUrl = imageData[0].url;

      // 화면에 표시
      displayFact(fact, imageUrl);

      // 히스토리에 저장
      saveToHistory(fact, imageUrl);

    } catch (error) {
      console.error('오류:', error);
      displayError('상식을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * 화면에 상식과 이미지를 표시합니다.
   */
  function displayFact(fact, imageUrl) {
    factElement.textContent = fact;
    imageElement.src = imageUrl;
  }

  /**
   * 로딩 및 오류 상태를 화면에 표시합니다.
   */
  function setLoading(isLoading) {
    factElement.textContent = isLoading ? "로딩 중..." : "";
    getFactButton.disabled = isLoading;
    if (isLoading) {
      imageElement.src = "icon.png"; // 로딩 중 기본 이미지
    }
  }

  function displayError(message) {
    factElement.textContent = message;
    imageElement.src = "icon.png"; // 오류 시 기본 이미지
  }

  // --- 히스토리 기능 함수 ---

  /**
   * 상식과 이미지 URL을 로컬 스토리지에 저장합니다.
   */
  async function saveToHistory(fact, imageUrl) {
    // 1. 기존 히스토리 가져오기
    const result = await chrome.storage.local.get(['history']);
    const history = result.history || [];

    // 2. 새 항목 추가 (최대 5개 유지)
    const newHistory = [
      { fact, imageUrl }, // 새 항목을 맨 위에 추가
      ...history
    ].slice(0, 5); // 5개만 남김

    // 3. 스토리지에 저장
    await chrome.storage.local.set({ history: newHistory });

    // 4. 히스토리 목록 UI 새로고침
    renderHistory(newHistory);
  }

  /**
   * 스토리지에서 히스토리를 로드하여 화면에 표시합니다.
   */
  async function loadHistory() {
    const result = await chrome.storage.local.get(['history']);
    const history = result.history || [];
    renderHistory(history);
  }

  /**
   * 히스토리 배열을 받아 <ul> 목록을 만듭니다.
   */
  function renderHistory(history) {
    historyListElement.innerHTML = ""; // 목록 초기화

    if (history.length === 0) {
      const li = document.createElement('li');
      li.textContent = "최근 본 상식이 없습니다.";
      li.style.color = "#999";
      li.style.cursor = "default";
      historyListElement.appendChild(li);
      return;
    }

    history.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item.fact;
      li.title = item.fact; // 마우스 올리면 전체 텍스트 표시
      
      // 히스토리 항목 클릭 시 메인 화면에 해당 내용 표시
      li.addEventListener('click', () => {
        displayFact(item.fact, item.imageUrl);
      });
      
      historyListElement.appendChild(li);
    });
  }

  /**
   * 모든 히스토리를 삭제합니다.
   */
  async function clearHistory() {
    await chrome.storage.local.set({ history: [] }); // 스토리지 비우기
    renderHistory([]); // UI 비우기
  }
});