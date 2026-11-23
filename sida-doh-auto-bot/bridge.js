/**
 * Bridge content script connecting the 8708 web app (standalone or nested Google Apps Script iframe)
 * to DOH Auto-Bot background worker.
 */
(function () {
  'use strict';

  // Run relay only in the top frame so standalone pages AND nested Google Apps Script iframes
  // communicate cleanly without duplicate listeners.
  if (window !== window.top) return;

  const TO_EXT = 'SIDA_DOH_BOT_TO_EXT';
  const FROM_EXT = 'SIDA_DOH_BOT_FROM_EXT';
  const VERSION = (chrome.runtime && chrome.runtime.getManifest ? chrome.runtime.getManifest().version : '1.0.4');
  let lastClientSource = null;

  function replyToClient(targetWin, data) {
    const dest = targetWin || lastClientSource || window;
    try {
      dest.postMessage(data, '*');
    } catch (e) {
      try { window.postMessage(data, '*'); } catch (e2) {}
    }
  }

  function announceReady() {
    replyToClient(window, {
      channel: FROM_EXT,
      type: 'READY',
      version: VERSION,
      name: 'DOH Auto-Bot (แบบ 8708 อ.สีดา)'
    });
  }

  window.addEventListener('message', function (ev) {
    if (!ev.data || ev.data.channel !== TO_EXT) return;
    const clientWin = ev.source || window;
    lastClientSource = clientWin;
    const msg = ev.data;
    try {
      chrome.runtime.sendMessage(msg, function (resp) {
        if (chrome.runtime.lastError) {
          replyToClient(clientWin, {
            channel: FROM_EXT,
            type: 'ERROR',
            reqId: msg.reqId,
            error: chrome.runtime.lastError.message
          });
          return;
        }
        replyToClient(clientWin, {
          channel: FROM_EXT,
          type: msg.type === 'PING' ? 'PONG' : 'ACK',
          reqId: msg.reqId,
          version: VERSION,
          payload: resp || { ok: true }
        });
      });
    } catch (err) {
      replyToClient(clientWin, {
        channel: FROM_EXT,
        type: 'ERROR',
        reqId: msg.reqId,
        error: err && err.message ? err.message : String(err)
      });
    }
  });

  chrome.runtime.onMessage.addListener(function (msg) {
    if (!msg || msg.channel !== FROM_EXT) return;
    replyToClient(lastClientSource || window, msg);
  });

  // ประกาศสถานะพร้อมใช้งานทันทีเมื่อโหลดหน้าเว็บ 8708
  announceReady();
  setTimeout(announceReady, 800);
  setTimeout(announceReady, 2000);
})();
