importScripts('doh_logic.js');

const DOH_URL = 'https://dohgis.doh.go.th/dohtotravel/';
const DOH_WATERMARK_URL = 'https://dohgis.doh.go.th/dohtotravel/assets/logo_report.4717a982.png';
const PLACE_CACHE_KEY = 'doh_place_cache_v1';

let activeJob = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sendToApp(job, payload) {
  if (!job || typeof job.appTabId !== 'number') return;
  const opts = typeof job.appFrameId === 'number' ? { frameId: job.appFrameId } : undefined;
  chrome.tabs.sendMessage(job.appTabId, { channel: 'SIDA_DOH_BOT_FROM_EXT', ...payload }, opts).catch(() => {});
}

async function loadPlaceCache() {
  try {
    const res = await chrome.storage.local.get(PLACE_CACHE_KEY);
    return (res && res[PLACE_CACHE_KEY] && typeof res[PLACE_CACHE_KEY] === 'object') ? res[PLACE_CACHE_KEY] : {};
  } catch (e) {
    return {};
  }
}

async function savePlaceCache(cache) {
  try {
    await chrome.storage.local.set({ [PLACE_CACHE_KEY]: cache });
  } catch (e) { /* ignore quota */ }
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchAsDataUrl(url, opts = {}) {
  const timeoutMs = opts.timeoutMs || 35000;
  const retries = opts.retries != null ? opts.retries : 2;
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, credentials: 'omit' });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const ct = res.headers.get('content-type') || 'image/jpeg';
      if (!ct.startsWith('image/')) throw new Error('Non-image content-type: ' + ct);
      const ab = await res.arrayBuffer();
      if (ab.byteLength < 500) throw new Error('Image response too small (' + ab.byteLength + ' bytes)');
      return 'data:' + ct.split(';')[0] + ';base64,' + arrayBufferToBase64(ab);
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) await sleep(1000 * (attempt + 1));
    }
  }
  throw lastErr || new Error('Failed to fetch image');
}

async function ensureDohTab(windowId) {
  const existing = await chrome.tabs.query({ url: 'https://dohgis.doh.go.th/dohtotravel*' });
  if (existing && existing.length > 0) {
    const tab = existing[0];
    if (tab.status !== 'complete') {
      await waitForTabComplete(tab.id, 25000);
    }
    return tab.id;
  }
  const created = await chrome.tabs.create({
    url: DOH_URL,
    active: false,
    windowId: windowId
  });
  await waitForTabComplete(created.id, 25000);
  return created.id;
}

function isDohHttpUrl(u) {
  return /^https?:\/\/[^/]*doh\.go\.th/i.test(String(u || ''));
}

function waitForTabComplete(tabId, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (delayMs) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpd);
      setTimeout(resolve, delayMs);
    };
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(onUpd);
      resolve(); // proceed and verify URL explicitly in injectDohLogic
    }, timeoutMs);

    const onUpd = (id, info, tab) => {
      if (id === tabId && info.status === 'complete') {
        const u = (tab && tab.url) || '';
        if (isDohHttpUrl(u) || /^chrome-error:/i.test(u)) {
          finish(600);
        }
      }
    };
    chrome.tabs.onUpdated.addListener(onUpd);
    chrome.tabs.get(tabId).then((t) => {
      const u = (t && t.url) || '';
      if (t && t.status === 'complete' && (isDohHttpUrl(u) || /^chrome-error:/i.test(u))) {
        finish(400);
      }
    }).catch((err) => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpd);
        reject(err);
      }
    });
  });
}

async function injectDohLogic(tabId) {
  const t = await chrome.tabs.get(tabId);
  const curUrl = (t && t.url) || '';
  if (/^chrome-error:/i.test(curUrl)) {
    throw new Error('เปิดเว็บ DOH TO TRAVEL (dohgis.doh.go.th) ไม่สำเร็จ — เว็บกรมทางหลวงอาจล่มหรือติดเน็ตเวิร์ก');
  }
  if (!isDohHttpUrl(curUrl)) {
    throw new Error('แท็บ DOH ยังโหลดไม่เสร็จ (URL ปัจจุบัน: ' + (curUrl || 'ว่าง') + ') กรุณาลองกดใหม่อีกครั้ง');
  }
  await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    files: ['doh_logic.js']
  });
}

async function checkAntiBotInDohTab(tabId) {
  const t = await chrome.tabs.get(tabId);
  const curUrl = (t && t.url) || '';
  if (/^chrome-error:/i.test(curUrl)) {
    throw new Error('เปิดเว็บ DOH TO TRAVEL (dohgis.doh.go.th) ไม่สำเร็จ — หน้าแท็บขึ้น Error (เว็บกรมทางหลวงอาจล่มหรือเน็ตบล็อก)');
  }
  if (!isDohHttpUrl(curUrl)) {
    throw new Error('แท็บ DOH ยังไม่เข้าหน้าเว็บที่ถูกต้อง (URL ปัจจุบัน: ' + (curUrl || 'ว่าง') + ') กรุณาเปิด https://dohgis.doh.go.th/dohtotravel/ ทิ้งไว้ในแท็บหนึ่งแล้วลองใหม่');
  }
  try {
    const res = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        const title = (document.title || '').toLowerCase();
        const text = (document.body && document.body.innerText ? document.body.innerText : '').toLowerCase();
        const hasCaptchaIframe = Boolean(document.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], iframe[src*="_Incapsula_Resource"]'));
        const blockedText = /verify you are human|captcha|request unsuccessful|incapsula incident id|access denied/.test(title + ' ' + text);
        return {
          isChallenge: hasCaptchaIframe || blockedText,
          title: document.title || '',
          url: location.href
        };
      }
    });
    return res && res[0] ? res[0].result : { isChallenge: false };
  } catch (err) {
    throw new Error('ไม่สามารถเข้าถึงแท็บ DOH ได้ (v1.0.4 · URL: ' + curUrl + ') — ' + (err && err.message ? err.message : err));
  }
}

async function updateDohTabHud(tabId, text, tone = 'running') {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      args: [text, tone],
      func: (msg, state) => {
        let hud = document.getElementById('sida-doh-bot-hud');
        if (!hud) {
          hud = document.createElement('div');
          hud.id = 'sida-doh-bot-hud';
          hud.style.cssText =
            'position:fixed;top:12px;right:12px;z-index:2147483647;max-width:380px;' +
            'padding:10px 14px;border-radius:10px;font-family:Sarabun,Tahoma,sans-serif;' +
            'font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.22);' +
            'border:2px solid #0f766e;background:#f0fdfa;color:#134e4a;line-height:1.4;';
          document.body && document.body.appendChild(hud);
        }
        if (state === 'done') {
          hud.style.borderColor = '#15803d';
          hud.style.background = '#f0fdf4';
          hud.style.color = '#14532d';
        } else if (state === 'warn') {
          hud.style.borderColor = '#d97706';
          hud.style.background = '#fffbeb';
          hud.style.color = '#78350f';
        } else {
          hud.style.borderColor = '#0f766e';
          hud.style.background = '#f0fdfa';
          hud.style.color = '#134e4a';
        }
        hud.textContent = msg;
      }
    });
  } catch (e) { /* tab may be closed */ }
}

/**
 * ทำงานภายใน MAIN world ของแท็บ https://dohgis.doh.go.th/dohtotravel/
 * เพื่อใช้ระบบค้นหาสถานที่และระบบคำนวณระยะทางจริงของ DOH TO TRAVEL
 */
async function resolveAndRouteTripInDohTab(tabId, trip, opts, cacheSnapshot) {
  const execRes = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    args: [trip, opts, cacheSnapshot],
    func: async (tripArg, optsArg, cacheArg) => {
      const L = window.__sidaDohLogic;
      if (!L) throw new Error('doh_logic not loaded in DOH tab');

      const routeType = (optsArg && optsArg.routeType) || 'c';
      const avoidFerry = !!(optsArg && optsArg.avoidFerry);
      const avoidTollway = !!(optsArg && optsArg.avoidTollway);
      const typeVal = (avoidFerry ? 0 : 8) + (avoidTollway ? 0 : 16) + 1;

      const localCache = Object.assign({}, cacheArg || {});
      const newlyCached = {};

      async function fetchJsonSafe(url, timeoutMs = 15000) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const res = await fetch(url, { signal: ctrl.signal });
          clearTimeout(timer);
          const raw = await res.text();
          if (/verify you are human|incapsula incident id|captcha/i.test(raw)) {
            return { __captcha: true };
          }
          if (/Route Service API Key Error/i.test(raw)) {
            return { __apiKeyError: true, raw };
          }
          try {
            return JSON.parse(raw);
          } catch (e) {
            return { __parseError: true, raw: raw.slice(0, 160) };
          }
        } catch (err) {
          clearTimeout(timer);
          return { __networkError: err && err.message ? err.message : String(err) };
        }
      }

      async function searchDohPlace(stop) {
        const areaTag = L.normThai((stop.province || '') + '|' + (stop.amphoe || '') + '|' + (stop.isOffice ? (stop.officeName || stop.label || '') : ''));
        const cacheKey = stop.id
          ? ('id:' + areaTag + ':' + stop.id)
          : ('kw:' + areaTag + ':' + L.normThai(stop.searchKeyword || stop.label || ''));
        if (cacheKey && localCache[cacheKey] && isFinite(Number(localCache[cacheKey].lat))) {
          return { place: localCache[cacheKey], fromCache: true, confidence: 'high' };
        }

        const queries = L.buildSearchQueries(stop);
        let bestOverall = null;
        let bestScore = -9999;
        let bestConfidence = 'none';

        for (let i = 0; i < queries.length; i++) {
          const q = queries[i];
          const primaryUrl = 'https://map.doh.go.th/mapsearch/json/search?' + new URLSearchParams({
            keyword: q,
            offset: '0',
            locale: 'th',
            dataset: 'data2p,data2r,data2a,data2b,change,con,m2h',
            key: 'dohtotravel-test'
          });
          const data1 = await fetchJsonSafe(primaryUrl, 15000);
          if (data1 && data1.__captcha) return { __captcha: true };

          let items = (data1 && Array.isArray(data1.data)) ? data1.data : [];
          if (!items.length) {
            const smartUrl = 'https://map1.doh.go.th/smartsearch/json/search?' + new URLSearchParams({
              keyword: q,
              offset: '0',
              locale: 'th',
              dataset: 'data2p,data2r,data2a,data2b,change,con,m2h',
              forcelimit: '20',
              key: 'dohtotravel-test'
            });
            const data2 = await fetchJsonSafe(smartUrl, 15000);
            if (data2 && data2.__captcha) return { __captcha: true };
            items = (data2 && Array.isArray(data2.data)) ? data2.data : [];
          }

          if (items.length) {
            const picked = L.pickBestCandidate(items, stop);
            if (picked.best && picked.score > bestScore) {
              bestOverall = picked.best;
              bestScore = picked.score;
              bestConfidence = picked.confidence;
            }
            if (bestConfidence === 'high') break;
          }
          await new Promise((r) => setTimeout(r, 150));
        }

        if (!bestOverall) {
          return { place: null, confidence: 'none' };
        }

        const place = {
          name: String(bestOverall.name || stop.label || '').trim(),
          address: String(bestOverall.address || stop.fullAddress || '').trim(),
          lat: Number(bestOverall.lat),
          lon: Number(bestOverall.lon)
        };
        if (cacheKey && bestScore >= 60) {
          localCache[cacheKey] = place;
          newlyCached[cacheKey] = place;
        }
        return { place, confidence: bestConfidence, score: bestScore };
      }

      const stops = Array.isArray(tripArg.stops) ? tripArg.stops : [];
      if (stops.length < 2) {
        return { ok: false, error: 'ต้องมีอย่างน้อย 2 จุด (ต้นทางและปลายทาง)' };
      }

      const resolvedPlaces = [];
      const unresolvedStops = [];
      for (let i = 0; i < stops.length; i++) {
        const st = stops[i];
        const found = await searchDohPlace(st);
        if (found && found.__captcha) {
          return { ok: false, captchaRequired: true };
        }
        if (!found || !found.place) {
          unresolvedStops.push(st.label || st.searchKeyword || ('จุดที่ ' + (i + 1)));
        } else {
          resolvedPlaces.push(found.place);
        }
      }

      if (unresolvedStops.length > 0 || resolvedPlaces.length < 2) {
        return {
          ok: false,
          error: 'ค้นหาจุดแวะไม่พบบน DOH: ' + unresolvedStops.join(', '),
          unresolvedStops,
          newlyCached
        };
      }

      let totalDistance = 0;
      let totalInterval = 0;
      for (let i = 0; i < resolvedPlaces.length - 1; i++) {
        const a = resolvedPlaces[i];
        const b = resolvedPlaces[i + 1];
        if (Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lon - b.lon) < 1e-6) continue;

        const routeUrl = 'https://api.longdo.com/RouteService/geojson/route?' + new URLSearchParams({
          flon: String(a.lon),
          flat: String(a.lat),
          tlon: String(b.lon),
          tlat: String(b.lat),
          mode: routeType,
          type: String(typeVal),
          locale: 'th',
          key: 'dohtotravel-test'
        });
        const leg = await fetchJsonSafe(routeUrl, 18000);
        if (leg && leg.__captcha) return { ok: false, captchaRequired: true };
        if (leg && leg.__apiKeyError) {
          return { ok: false, error: 'DOH Route API ปฏิเสธสิทธิ์ (กรุณาเปิดหน้า https://dohgis.doh.go.th/dohtotravel/ แล้วลองใหม่)' };
        }
        if (!leg || !leg.data || typeof leg.data.distance !== 'number') {
          return {
            ok: false,
            error: 'คำนวณเส้นทางช่วงที่ ' + (i + 1) + ' ไม่สำเร็จ (' + a.name + ' → ' + b.name + ')',
            newlyCached
          };
        }
        totalDistance += Number(leg.data.distance) || 0;
        totalInterval += Number(leg.data.interval) || 0;
        await new Promise((r) => setTimeout(r, 140));
      }

      const rawKm = Number((totalDistance / 1000).toFixed(2));
      const flooredKm = L.floorKm(rawKm);
      const distanceText = L.distanceToUnit(totalDistance);
      const durationText = L.intervalToUnit(totalInterval);
      const routeHeadline = L.buildRouteHeadline(resolvedPlaces);
      const snippetUrl = L.buildSnippetUrl(resolvedPlaces, { routeType, avoidFerry, avoidTollway });

      return {
        ok: true,
        totalDistanceMeters: totalDistance,
        totalIntervalSec: totalInterval,
        rawKm,
        flooredKm,
        distanceText,
        durationText,
        routeType,
        routeTypeText: L.routeTypeLabel(routeType),
        routeHeadline,
        snippetUrl,
        resolvedPlaces,
        newlyCached
      };
    }
  });
  return execRes && execRes[0] ? execRes[0].result : { ok: false, error: 'ไม่สามารถรันสคริปต์ในแท็บ DOH ได้' };
}

async function renderReportCardInDohTab(tabId, payload) {
  const execRes = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    args: [payload],
    func: async (p) => {
      const L = window.__sidaDohLogic;
      const canvas = document.createElement('canvas');
      return await L.renderDohReportCardOnCanvas(canvas, p);
    }
  });
  return execRes && execRes[0] ? execRes[0].result : '';
}

async function runBatchJob(job) {
  let completed = 0;
  let failed = 0;
  try {
    sendToApp(job, { type: 'STATUS', jobId: job.jobId, message: 'กำลังเปิดแท็บ DOH TO TRAVEL (dohgis.doh.go.th)...' });

    const appTab = await chrome.tabs.get(job.appTabId);
    job.dohTabId = await ensureDohTab(appTab.windowId);

    const gate = await checkAntiBotInDohTab(job.dohTabId);
    if (gate && gate.isChallenge) {
      await chrome.tabs.update(job.dohTabId, { active: true });
      sendToApp(job, {
        type: 'CAPTCHA_REQUIRED',
        jobId: job.jobId,
        message: 'เว็บ DOH TO TRAVEL แสดงหน้าตรวจสอบความปลอดภัย กรุณายืนยันตัวตนบนแท็บ DOH ด้วยตนเองแล้วกดลองใหม่อีกครั้ง'
      });
      return;
    }

    await injectDohLogic(job.dohTabId);
    await updateDohTabHud(job.dohTabId, '🤖 DOH Auto-Bot พร้อมเริ่มดึงข้อมูล ' + job.trips.length + ' วัน...');

    // ดึงลายน้ำตรา กรมทางหลวง ครั้งเดียว
    let watermarkDataUrl = null;
    try {
      watermarkDataUrl = await fetchAsDataUrl(DOH_WATERMARK_URL, { timeoutMs: 12000, retries: 1 });
    } catch (e) {
      watermarkDataUrl = null;
    }

    let placeCache = await loadPlaceCache();

    for (let i = 0; i < job.trips.length; i++) {
      if (job.cancelled) break;
      const trip = job.trips[i];
      const stepLabel = (i + 1) + '/' + job.trips.length;

      sendToApp(job, {
        type: 'PROGRESS',
        jobId: job.jobId,
        index: i,
        total: job.trips.length,
        rowId: trip.rowId,
        dateText: trip.dateText,
        phase: 'searching',
        message: `กำลังค้นหาระยะทางวัน ${stepLabel} (${trip.dateText})...`
      });
      await updateDohTabHud(job.dohTabId, `🤖 DOH Auto-Bot (${stepLabel}): กำลังค้นหาเส้นทางวันที่ ${trip.dateText}...`);

      const routeRes = await resolveAndRouteTripInDohTab(job.dohTabId, trip, job.opts, placeCache);

      if (routeRes && routeRes.newlyCached && Object.keys(routeRes.newlyCached).length) {
        placeCache = Object.assign({}, placeCache, routeRes.newlyCached);
        await savePlaceCache(placeCache);
      }

      if (routeRes && routeRes.captchaRequired) {
        await chrome.tabs.update(job.dohTabId, { active: true });
        await updateDohTabHud(job.dohTabId, '⚠️ พบหน้าตรวจสอบความปลอดภัย กรุณายืนยันบนหน้าเว็บนี้แล้วลองใหม่', 'warn');
        sendToApp(job, {
          type: 'CAPTCHA_REQUIRED',
          jobId: job.jobId,
          message: 'เว็บ DOH แสดงหน้าตรวจสอบความปลอดภัย กรุณายืนยันด้วยตนเองบนแท็บ DOH แล้วกดเริ่มใหม่อีกครั้ง'
        });
        return;
      }

      if (!routeRes || !routeRes.ok) {
        failed++;
        sendToApp(job, {
          type: 'DAY_RESULT',
          jobId: job.jobId,
          rowId: trip.rowId,
          dateText: trip.dateText,
          ok: false,
          error: (routeRes && routeRes.error) || 'ไม่พบข้อมูลเส้นทางจาก DOH'
        });
        await sleep(450);
        continue;
      }

      if (job.cancelled) break;

      sendToApp(job, {
        type: 'PROGRESS',
        jobId: job.jobId,
        index: i,
        total: job.trips.length,
        rowId: trip.rowId,
        dateText: trip.dateText,
        phase: 'capturing',
        rawKm: routeRes.rawKm,
        flooredKm: routeRes.flooredKm,
        message: `ได้ระยะ ${routeRes.rawKm} → ปัดลง ${routeRes.flooredKm} กม. · กำลังแคปภาพแผนที่ DOH (${stepLabel})...`
      });
      await updateDohTabHud(job.dohTabId, `📸 DOH Auto-Bot (${stepLabel}): กำลังสร้างภาพรายงาน ${routeRes.distanceText}...`);

      let imageDataUrl = '';
      let imageWarn = '';
      try {
        const mapDataUrl = await fetchAsDataUrl(routeRes.snippetUrl, { timeoutMs: 35000, retries: 2 });
        imageDataUrl = await renderReportCardInDohTab(job.dohTabId, {
          mapDataUrl,
          watermarkDataUrl,
          routeHeadline: routeRes.routeHeadline,
          routeType: routeRes.routeType,
          routeTypeText: routeRes.routeTypeText,
          durationText: routeRes.durationText,
          distanceText: routeRes.distanceText
        });
      } catch (imgErr) {
        imageWarn = 'ดึงภาพแผนที่ไม่สำเร็จ (' + (imgErr && imgErr.message ? imgErr.message : imgErr) + ')';
      }

      completed++;
      sendToApp(job, {
        type: 'DAY_RESULT',
        jobId: job.jobId,
        rowId: trip.rowId,
        dateText: trip.dateText,
        ok: true,
        rawKm: routeRes.rawKm,
        flooredKm: routeRes.flooredKm,
        totalDistanceMeters: routeRes.totalDistanceMeters,
        totalIntervalSec: routeRes.totalIntervalSec,
        distanceText: routeRes.distanceText,
        durationText: routeRes.durationText,
        routeHeadline: routeRes.routeHeadline,
        routeTypeText: routeRes.routeTypeText,
        resolvedPlaces: routeRes.resolvedPlaces,
        imageDataUrl,
        imageWarn
      });

      if (i < job.trips.length - 1 && !job.cancelled) {
        await sleep(650);
      }
    }

    const doneMsg = job.cancelled
      ? `⏹ หยุดการทำงานแล้ว (ดึงสำเร็จ ${completed} วัน)`
      : `✅ ดึงข้อมูลและแคปภาพจาก DOH สำเร็จ ${completed}/${job.trips.length} วัน` + (failed ? ` (ไม่สำเร็จ ${failed} วัน)` : '');
    await updateDohTabHud(job.dohTabId, doneMsg, failed || job.cancelled ? 'warn' : 'done');
    sendToApp(job, {
      type: 'BATCH_DONE',
      jobId: job.jobId,
      completed,
      failed,
      total: job.trips.length,
      cancelled: !!job.cancelled,
      message: doneMsg
    });
  } catch (err) {
    sendToApp(job, {
      type: 'BATCH_ERROR',
      jobId: job.jobId,
      error: (err && err.message) ? err.message : String(err)
    });
  } finally {
    if (activeJob && activeJob.jobId === job.jobId) {
      activeJob.running = false;
    }
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return false;

  if (msg.type === 'PING') {
    sendResponse({ ok: true, version: '1.2.2', name: 'DOH Auto-Bot (แบบ 8708 + T&V ทุกอำเภอ)' });
    return false;
  }

  if (msg.type === 'GET_STATUS') {
    loadPlaceCache().then((cache) => {
      sendResponse({
        ok: true,
        running: Boolean(activeJob && activeJob.running),
        cachedCount: Object.keys(cache).length
      });
    });
    return true;
  }

  if (msg.type === 'CLEAR_CACHE') {
    chrome.storage.local.remove(PLACE_CACHE_KEY).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'CANCEL_BATCH') {
    if (activeJob) activeJob.cancelled = true;
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === 'START_BATCH') {
    if (activeJob && activeJob.running) {
      activeJob.cancelled = true;
    }
    const job = {
      jobId: msg.jobId || ('job_' + Date.now()),
      appTabId: sender && sender.tab ? sender.tab.id : null,
      appFrameId: sender && typeof sender.frameId === 'number' ? sender.frameId : undefined,
      dohTabId: null,
      trips: Array.isArray(msg.trips) ? msg.trips : [],
      opts: msg.opts || { routeType: 'c', avoidTollway: false, avoidFerry: false },
      cancelled: false,
      running: true
    };
    activeJob = job;
    sendResponse({ ok: true, jobId: job.jobId });
    runBatchJob(job);
    return false;
  }

  if (msg.type === 'START_TV_SEND') {
    const job = {
      jobId: msg.jobId || ('tvjob_' + Date.now()),
      appTabId: sender && sender.tab ? sender.tab.id : null,
      appFrameId: sender && typeof sender.frameId === 'number' ? sender.frameId : undefined,
      plan: msg.plan || {}
    };
    sendResponse({ ok: true, jobId: job.jobId });
    runTvSendJob(job);
    return false;
  }

  return false;
});

/* ==================== T&V DOAE Work Plan Auto-Sender (tandv.doae.go.th) ==================== */
const TANDV_START_URL = 'https://tandv.doae.go.th/workflow/workflow_start.php?W=26';
const TANDV_LOGIN_URL = 'https://tandv.doae.go.th/index/login_tv_system.php';

function waitTabReady(tabId, timeoutMs = 25000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(tmr);
      chrome.tabs.onUpdated.removeListener(onUpd);
      setTimeout(resolve, 600);
    };
    const tmr = setTimeout(finish, timeoutMs);
    const onUpd = (id, info) => {
      if (id === tabId && info.status === 'complete') finish();
    };
    chrome.tabs.onUpdated.addListener(onUpd);
    chrome.tabs.get(tabId).then((t) => {
      if (t && t.status === 'complete') finish();
    }).catch(() => finish());
  });
}

async function runTvSendJob(job) {
  try {
    sendToApp(job, { type: 'TV_SEND_PROGRESS', jobId: job.jobId, message: 'กำลังเปิดหน้าบันทึกแผน T&V (tandv.doae.go.th)...' });
    const existing = await chrome.tabs.query({ url: 'https://tandv.doae.go.th/workflow/workflow_start.php*' });
    let tabId;
    if (existing && existing.length > 0) {
      tabId = existing[0].id;
      await chrome.tabs.update(tabId, { active: true });
      if (existing[0].status !== 'complete') await waitTabReady(tabId, 20000);
    } else {
      const created = await chrome.tabs.create({ url: TANDV_START_URL, active: true });
      tabId = created.id;
      await waitTabReady(tabId, 25000);
    }

    const tabInfo = await chrome.tabs.get(tabId);
    const curUrl = (tabInfo && tabInfo.url) || '';
    let needsLogin = !/tandv\.doae\.go\.th\/workflow\/workflow_start\.php/i.test(curUrl);
    if (!needsLogin) {
      try {
        const chk = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          world: 'MAIN',
          func: () => !!(document.getElementById('form_wf') && document.getElementById('PL_YAER'))
        });
        if (!(chk && chk[0] && chk[0].result)) needsLogin = true;
      } catch (e) {
        needsLogin = true;
      }
    }
    if (needsLogin) {
      if (!/doaepass\.doae\.go\.th/i.test(curUrl)) {
        await chrome.tabs.update(tabId, { url: TANDV_LOGIN_URL, active: true });
      } else {
        await chrome.tabs.update(tabId, { active: true });
      }
      sendToApp(job, {
        type: 'TV_SEND_AUTH_REQUIRED',
        jobId: job.jobId,
        url: TANDV_LOGIN_URL,
        message: 'ยังไม่ได้เข้าสู่ระบบ T&V — เปิดหน้าสแกน ThaiD (DOAE Pass) ให้แล้วครับ สแกนเข้าสู่ระบบเรียบร้อยแล้วกลับมากดปุ่ม "🚀 ส่งแผนเข้าเว็บ T&V" อีกครั้งได้เลย'
      });
      return;
    }

    sendToApp(job, { type: 'TV_SEND_PROGRESS', jobId: job.jobId, message: 'กำลังตั้งค่าปีงบประมาณ เดือน ผู้อนุมัติ และกรอกรายการแผนทีละแถว...' });

    const execRes = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      args: [job.plan],
      func: async (planArg) => {
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
        const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const setSelect2 = (selEl, val) => {
          if (!selEl) return false;
          selEl.value = val;
          try {
            if (window.jQuery) {
              window.jQuery(selEl).val(val).trigger('change');
              return true;
            }
          } catch (e) {}
          selEl.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        };
        const waitFor = async (fn, timeoutMs = 12000, stepMs = 250) => {
          const start = Date.now();
          while (Date.now() - start < timeoutMs) {
            const v = fn();
            if (v) return v;
            await delay(stepMs);
          }
          return null;
        };

        const items = Array.isArray(planArg && planArg.items) ? planArg.items : [];
        if (!items.length) return { ok: false, error: 'ไม่มีรายการแผนที่จะส่ง' };

        // 1. เลือกปีงบประมาณ (PL_YAER), เดือน (PL_MOUNT), และผู้อนุมัติ (USR_APPROVERS)
        const fiscalYear = String(planArg.fiscalYearBE || '');
        const monthFull = String(planArg.monthFull || '').trim();
        const approverName = String(planArg.approverName || '').trim();

        const yrEl = document.getElementById('PL_YAER');
        if (yrEl && fiscalYear) {
          const yrOpt = Array.from(yrEl.options).find((o) => String(o.value).trim() === fiscalYear || o.text.includes(fiscalYear));
          if (yrOpt) {
            setSelect2(yrEl, yrOpt.value);
            await delay(900);
          }
        }

        if (monthFull) {
          const moOpt = await waitFor(() => {
            const moEl = document.getElementById('PL_MOUNT');
            if (!moEl) return null;
            return Array.from(moEl.options).find((o) => o.value && o.text.includes(monthFull)) || null;
          }, 8000);
          if (moOpt) {
            setSelect2(document.getElementById('PL_MOUNT'), moOpt.value);
            await delay(700);
          }
        }

        const appEl = document.getElementById('USR_APPROVERS');
        if (appEl) {
          let appOpt = approverName
            ? Array.from(appEl.options).find((o) => o.value && o.text.includes(approverName))
            : null;
          if (!appOpt) appOpt = Array.from(appEl.options).find((o) => o.value && !o.disabled);
          if (appOpt) {
            setSelect2(appEl, appOpt.value);
            await delay(400);
          }
        }

        const mapIssueCode = (cat) => {
          const c = norm(cat);
          if (c.includes('training') || c.includes('ถ่ายทอด')) return '1';
          if (c.includes('supporting') || c.includes('สนับสนุน')) return '3';
          if (c.includes('supervision') || c.includes('นิเทศ')) return '4';
          if (c.includes('data') || c.includes('ข้อมูล')) return '5';
          return '2';
        };

        let sentCount = 0;
        const errors = [];

        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          try {
            const addBtn = document.querySelector('a[onclick*="form_mgt.php"]');
            if (!addBtn) throw new Error('ไม่พบปุ่ม "+ เพิ่มข้อมูล" บนหน้าแผน T&V');
            addBtn.click();

            const form = await waitFor(() => {
              const f = document.getElementById('form_wf_mgt');
              if (!f) return null;
              const issueSel = f.querySelector('#PD_ISSUES');
              return (issueSel && issueSel.options && issueSel.options.length > 1) ? f : null;
            }, 12000);
            if (!form) throw new Error('เปิดหน้าต่างเพิ่มรายการไม่สำเร็จ');

            // 1) ประเด็น
            const issueCode = mapIssueCode(it.category);
            const issueSel = form.querySelector('#PD_ISSUES');
            setSelect2(issueSel, issueCode);
            await delay(700);

            // 2) กิจกรรม (รอ AJAX โหลด option)
            const actSel = await waitFor(() => {
              const s = form.querySelector('#PD_ACTIVITY');
              return (s && s.options && s.options.length > 1) ? s : null;
            }, 8000);
            if (actSel) {
              const actText = String(it.activity || '').trim();
              const isOtherPrefix = /^อื่นๆ\s*:?/i.test(actText);
              const cleanAct = norm(actText.replace(/^อื่นๆ\s*:?\s*/i, ''));
              let chosen = null;
              if (!isOtherPrefix && cleanAct) {
                chosen = Array.from(actSel.options).find((o) => o.value && norm(o.text) === cleanAct)
                  || Array.from(actSel.options).find((o) => o.value && o.value !== '999' && (norm(o.text).includes(cleanAct) || cleanAct.includes(norm(o.text))));
              }
              if (!chosen) {
                chosen = Array.from(actSel.options).find((o) => o.value === '999') || Array.from(actSel.options).find((o) => o.value);
              }
              if (chosen) {
                setSelect2(actSel, chosen.value);
                await delay(450);
                if (chosen.value === '999') {
                  const otherInp = form.querySelector('input[name*="OTHER"], input[id*="OTHER"], input[name*="ETC"], input[id*="ETC"]');
                  if (otherInp) {
                    otherInp.value = actText.replace(/^อื่นๆ\s*:?\s*/i, '').trim() || actText;
                    otherInp.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }
              }
            }

            // 3) รายละเอียด, วันที่เริ่ม-สิ้นสุด, สถานที่, เป้าหมาย, หมายเหตุ
            const detEl = form.querySelector('#PD_DETAIL');
            if (detEl) {
              detEl.value = String(it.detail || it.activity || '').trim();
              detEl.dispatchEvent(new Event('input', { bubbles: true }));
            }

            const sDateEl = form.querySelector('#PD_SDATE');
            const eDateEl = form.querySelector('#PD_EDATE');
            if (sDateEl && it.dateDMY) {
              sDateEl.disabled = false;
              sDateEl.removeAttribute('disabled');
              sDateEl.value = it.dateDMY;
              sDateEl.dispatchEvent(new Event('input', { bubbles: true }));
              sDateEl.dispatchEvent(new Event('change', { bubbles: true }));
              if (window.jQuery) { try { window.jQuery(sDateEl).val(it.dateDMY).trigger('change'); } catch (e) {} }
              await delay(300);
            }
            if (eDateEl && it.dateDMY) {
              eDateEl.disabled = false;
              eDateEl.removeAttribute('disabled');
              eDateEl.value = it.dateDMY;
              eDateEl.dispatchEvent(new Event('input', { bubbles: true }));
              eDateEl.dispatchEvent(new Event('change', { bubbles: true }));
              if (window.jQuery) { try { window.jQuery(eDateEl).val(it.dateDMY).trigger('change'); } catch (e) {} }
            }

            const placeEl = form.querySelector('#PD_PLACE');
            if (placeEl) {
              placeEl.value = String(it.location || '').replace(/\n+/g, ' ').trim();
              placeEl.dispatchEvent(new Event('input', { bubbles: true }));
            }

            const targetEl = form.querySelector('#PD_TARGET');
            if (targetEl) {
              const numOnly = String(it.targetCount || '0').replace(/[^\d]/g, '') || '0';
              targetEl.value = numOnly;
              targetEl.dispatchEvent(new Event('input', { bubbles: true }));
              targetEl.dispatchEvent(new Event('change', { bubbles: true }));
            }

            const cmtEl = form.querySelector('#PD_COMMENT');
            if (cmtEl && it.note) {
              cmtEl.value = String(it.note || '').trim();
              cmtEl.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // 4) กดปุ่มบันทึกใน Modal (บันทึกรายการย่อยเข้าตาราง ไม่กดส่งอนุมัติหลัก)
            const saveBtn = form.querySelector('button[type="submit"]');
            if (!saveBtn) throw new Error('ไม่พบปุ่มบันทึกในหน้าต่างเพิ่มรายการ');
            saveBtn.disabled = false;
            saveBtn.removeAttribute('disabled');
            saveBtn.click();

            // รอ Modal ปิดหรือโหลดเสร็จ
            await delay(1300);
            await waitFor(() => {
              const m = document.getElementById('bizModal_402');
              return !m || !m.classList.contains('show') || m.style.display === 'none';
            }, 8000);
            await delay(400);
            sentCount++;
          } catch (rowErr) {
            errors.push('#' + (i + 1) + ': ' + (rowErr && rowErr.message ? rowErr.message : String(rowErr)));
            const closeBtn = document.querySelector('#bizModal_402 button.close-modal');
            if (closeBtn) closeBtn.click();
            await delay(400);
          }
        }

        let tempSaved = false;
        if (sentCount > 0) {
          // กดเฉพาะปุ่ม "บันทึกชั่วคราว" (#wf-btn-temp-save) เท่านั้น — ห้ามกดปุ่ม "บันทึกและส่งข้อมูล" (#wf-btn-save) เด็ดขาด!
          const saveStepEl = document.getElementById('SAVE_STEP');
          if (saveStepEl) saveStepEl.value = 'Y';
          const tempSaveBtn = document.getElementById('wf-btn-temp-save');
          if (tempSaveBtn) {
            await delay(500);
            tempSaveBtn.click();
            tempSaved = true;
          }
        }

        return { ok: sentCount > 0, sentCount: sentCount, total: items.length, tempSaved: tempSaved, errors: errors };
      }
    });

    const out = execRes && execRes[0] && execRes[0].result ? execRes[0].result : { ok: false, error: 'ไม่ได้รับผลลัพธ์จากหน้า T&V' };
    await chrome.tabs.update(tabId, { active: true });
    if (out.ok) {
      sendToApp(job, {
        type: 'TV_SEND_DONE',
        jobId: job.jobId,
        sentCount: out.sentCount,
        total: out.total,
        tempSaved: !!out.tempSaved,
        errors: out.errors || [],
        message: '✅ ส่งแผนเข้าเว็บ T&V แล้ว ' + out.sentCount + '/' + out.total + ' รายการ' +
          (out.tempSaved ? ' และกด "บันทึกชั่วคราว" เรียบร้อยแล้ว (ยังไม่ได้ส่งอนุมัติ)' : ' — กรุณาตรวจทานและกด "บันทึกชั่วคราว" ในแท็บ T&V ครับ')
      });
    } else {
      sendToApp(job, {
        type: 'TV_SEND_ERROR',
        jobId: job.jobId,
        error: out.error || (out.errors && out.errors.join('; ')) || 'ส่งแผนเข้าเว็บ T&V ไม่สำเร็จ'
      });
    }
  } catch (err) {
    sendToApp(job, {
      type: 'TV_SEND_ERROR',
      jobId: job.jobId,
      error: (err && err.message) ? err.message : String(err)
    });
  }
}
