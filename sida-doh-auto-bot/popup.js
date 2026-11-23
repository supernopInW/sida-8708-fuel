(function () {
  const pill = document.getElementById('status-pill');
  const countEl = document.getElementById('cache-count');
  const btnClear = document.getElementById('btn-clear-cache');

  function refresh() {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, function (res) {
      if (!res || !res.ok) return;
      if (res.running) {
        pill.textContent = '⏳ กำลังดึงข้อมูลจาก DOH TO TRAVEL...';
        pill.className = 'pill busy';
      } else {
        pill.textContent = '● พร้อมใช้งาน — กดปุ่มในหน้าแบบ 8708 ได้เลย';
        pill.className = 'pill';
      }
      countEl.textContent = (res.cachedCount || 0) + ' จุด';
    });
  }

  btnClear.addEventListener('click', function () {
    chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }, function () {
      refresh();
    });
  });

  refresh();
})();
