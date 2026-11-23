/**
 * ============================================================
 *  DOH Auto-Bot Core Logic (Universal UMD: Browser MAIN/ISOLATED + Node.js)
 *  ระบบค้นหาจุดแวะ คิดระยะทาง และสร้างภาพรายงานมาตรฐาน DOH TO TRAVEL
 *  สำนักงานเกษตรอำเภอสีดา จังหวัดนครราชสีมา
 * ============================================================
 */
(function (root) {
  'use strict';

  const SIDA_BOUNDS = {
    minLat: 15.38,
    maxLat: 15.74,
    minLon: 102.40,
    maxLon: 102.78
  };

  function thaiDigitsToArabic(str) {
    return String(str == null ? '' : str).replace(/[๐-๙]/g, function (c) {
      return String('๐๑๒๓๔๕๖๗๘๙'.indexOf(c));
    });
  }

  function normThai(str) {
    return thaiDigitsToArabic(str)
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /** ปัดระยะทางลงเป็นจำนวนเต็มกิโลเมตรเสมอ (42.66 -> 42, 35.99 -> 35) */
  function floorKm(val) {
    if (val == null || val === '') return 0;
    const s = thaiDigitsToArabic(val).replace(/,/g, '').trim();
    if (!s) return 0;
    const n = parseFloat(s);
    if (!isFinite(n) || n <= 0) return 0;
    return Math.floor(n);
  }

  /** รูปแบบระยะทางเดียวกับ DOH TO TRAVEL (RouteResultPage.distanceToUnit) */
  function distanceToUnit(meters) {
    const m = Number(meters) || 0;
    if (m < 1000) return Math.round(m) + ' เมตร';
    return (m / 1000).toFixed(2) + ' กิโลเมตร';
  }

  /** รูปแบบเวลาเดียวกับ DOH TO TRAVEL (RouteResultPage.intervalToUnit) */
  function intervalToUnit(seconds) {
    const s = Number(seconds) || 0;
    if (s < 60) return '< 1 นาที';
    if (s < 3600) return Math.round(s / 60) + ' นาที';
    const hrs = Math.floor(s / 3600);
    const mins = Math.round((s % 3600) / 60);
    return hrs + ' ชั่วโมง ' + mins + ' นาที';
  }

  /** ชื่อเงื่อนไขเส้นทางเดียวกับ DOH TO TRAVEL */
  function routeTypeLabel(mode) {
    switch (mode) {
      case 't': return 'ถนนหลัก (+จราจร)';
      case 'd': return 'ทางลัด';
      case 'c':
      default: return 'ถนนหลัก (สั้นและตรง)';
    }
  }

  function isInsideSidaBounds(lat, lon) {
    const la = Number(lat);
    const lo = Number(lon);
    if (!isFinite(la) || !isFinite(lo)) return false;
    return la >= SIDA_BOUNDS.minLat && la <= SIDA_BOUNDS.maxLat &&
      lo >= SIDA_BOUNDS.minLon && lo <= SIDA_BOUNDS.maxLon;
  }

  function getStopArea(stop) {
    const s = stop || {};
    const amphoe = String(s.amphoe || '').replace(/^(อำเภอ|อ\.|เขต)\s*/g, '').trim();
    const province = String(s.province || '').replace(/^(จังหวัด|จ\.)\s*/g, '').trim();
    const officeTambon = String(s.officeTambon || '').replace(/^(ตำบล|ต\.|แขวง)\s*/g, '').trim();
    const officeName = String(s.officeName || '').trim();
    // Backward compatibility: if amphoe/province omitted, infer Sida only when text mentions Sida or legacy Sida stop
    if (!amphoe && !province) {
      const text = normThai((s.fullAddress || '') + ' ' + (s.searchKeyword || '') + ' ' + (s.label || ''));
      const isLegacySida = text.includes('สีดา') || text.includes('30430') || (s.tambon && s.tambon !== 'CUSTOM' && !s.amphoe);
      return {
        amphoe: isLegacySida ? 'สีดา' : '',
        province: isLegacySida ? 'นครราชสีมา' : '',
        officeTambon: isLegacySida ? 'สีดา' : '',
        officeName: officeName || (isLegacySida ? 'สำนักงานเกษตรอำเภอสีดา' : ''),
        isSida: isLegacySida
      };
    }
    const isSida = (amphoe === 'สีดา' && (!province || province === 'นครราชสีมา'));
    return {
      amphoe: amphoe,
      province: province,
      officeTambon: officeTambon || amphoe,
      officeName: officeName || (amphoe ? ('สำนักงานเกษตรอำเภอ' + amphoe) : ''),
      isSida: isSida
    };
  }

  function isSidaOfficeStop(stop) {
    if (!stop) return false;
    if (stop.isOffice || stop.id === 'office' || stop.tambon === 'OFFICE') return true;
    const text = normThai((stop.label || '') + ' ' + (stop.searchKeyword || '') + ' ' + (stop.fullAddress || ''));
    return text.includes('สำนักงานเกษตรอำเภอ');
  }

  function isSidaDistrictStop(stop) {
    return getStopArea(stop).isSida;
  }

  /** สร้างชุดคำค้นแบบเรียงลำดับความแม่นยำสำหรับ map.doh.go.th (รองรับทุกอำเภอทั่วประเทศ) */
  function buildSearchQueries(stop) {
    const out = [];
    const pushUnique = function (q) {
      const s = String(q || '').replace(/\s+/g, ' ').trim();
      if (s && s.length >= 2 && out.indexOf(s) === -1) out.push(s);
    };

    const area = getStopArea(stop);
    const amphoe = area.amphoe;
    const province = area.province;

    if (isSidaOfficeStop(stop)) {
      const offName = area.officeName || String(stop.label || '').replace(/\s*\(กลับ\)\s*$/g, '').trim() || 'สำนักงานเกษตรอำเภอสีดา';
      pushUnique(offName);
      if (offName.indexOf('กรมส่งเสริมการเกษตร') === -1) {
        pushUnique('กรมส่งเสริมการเกษตร ' + offName);
      }
      if (amphoe && province) {
        pushUnique(offName + ' ' + province);
        pushUnique('เกษตรอำเภอ' + amphoe + ' ' + province);
      }
      if (stop.searchKeyword) pushUnique(stop.searchKeyword);
      if (stop.fullAddress) pushUnique(stop.fullAddress);
      return out;
    }

    const vName = String(stop.villageName || '').trim();
    const tambon = String(stop.tambon || '').trim();
    const moo = stop.moo ? String(stop.moo).trim() : '';

    if (vName && tambon && tambon !== 'OFFICE' && tambon !== 'CUSTOM') {
      if (amphoe) pushUnique(vName + ' ' + tambon + ' ' + amphoe);
      if (moo && amphoe) pushUnique(vName + ' หมู่ที่ ' + moo + ' ต.' + tambon + ' อ.' + amphoe);
      if (amphoe && province) pushUnique(vName + ' ต.' + tambon + ' อ.' + amphoe + ' จ.' + province);
      if (amphoe && province) pushUnique(vName + ' อ.' + amphoe + ' จ.' + province);
      pushUnique(vName);
    } else if (tambon && tambon !== 'OFFICE' && tambon !== 'CUSTOM') {
      if (moo && amphoe && province) pushUnique('หมู่ที่ ' + moo + ' ต.' + tambon + ' อ.' + amphoe + ' จ.' + province);
      if (moo && amphoe) pushUnique('หมู่ ' + moo + ' ตำบล' + tambon + ' อำเภอ' + amphoe);
      if (amphoe && province) pushUnique('ตำบล' + tambon + ' อำเภอ' + amphoe + ' จังหวัด' + province);
    }

    if (stop.searchKeyword) pushUnique(stop.searchKeyword);
    if (stop.fullAddress) pushUnique(stop.fullAddress);
    if (stop.label) {
      const cleanLbl = String(stop.label).replace(/\s*\(ม\.\d+\)\s*/g, '').replace(/\s*\(กลับ\)\s*/g, '').trim();
      if (cleanLbl) {
        if (amphoe && province && cleanLbl.indexOf(amphoe) === -1) {
          pushUnique(cleanLbl + ' อ.' + amphoe + ' จ.' + province);
        }
        pushUnique(cleanLbl);
      }
    }
    return out;
  }

  /** คะแนนความตรงกันของผลค้นหา DOH กับจุดแวะที่ต้องการ (รองรับทุกอำเภอทั่วประเทศ) */
  function scoreSearchCandidate(item, stop) {
    if (!item) return -9999;
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    if (!isFinite(lat) || !isFinite(lon) || (lat === 0 && lon === 0)) return -9999;

    const name = normThai(item.name || '');
    const addr = normThai(item.address || '');
    const combined = (name + ' ' + addr).trim();
    const area = getStopArea(stop);
    const expectAmphoe = normThai(area.amphoe);
    const expectProvince = normThai(area.province);
    const expectOfficeTambon = normThai(area.officeTambon);
    const expectOfficeName = normThai(area.officeName);
    let score = 0;

    if (isSidaOfficeStop(stop)) {
      if (expectOfficeName && combined.includes(expectOfficeName)) score += 160;
      else if (expectAmphoe && combined.includes('เกษตรอำเภอ' + expectAmphoe)) score += 110;
      else if (expectAmphoe && combined.includes('สำนักงานเกษตร') && combined.includes(expectAmphoe)) score += 90;
      else if (combined.includes('สำนักงานเกษตร')) score += 50;

      if (combined.includes('กรมส่งเสริมการเกษตร')) score += 55;
      if (expectOfficeTambon && (combined.includes('ต.' + expectOfficeTambon) || combined.includes('ตำบล' + expectOfficeTambon))) score += 35;
      if (expectAmphoe && (combined.includes('อ.' + expectAmphoe) || combined.includes('อำเภอ' + expectAmphoe) || combined.includes('เขต' + expectAmphoe))) score += 55;
      else if (expectAmphoe && combined.includes(expectAmphoe)) score += 25;
      else if (expectAmphoe) score -= 90;

      if (expectProvince && (combined.includes(expectProvince) || (area.isSida && combined.includes('30430')))) score += 35;
      else if (expectProvince) score -= 70;

      if (area.isSida) {
        score += isInsideSidaBounds(lat, lon) ? 60 : -260;
      }
      return score;
    }

    const vName = normThai(stop.villageName || '');
    const tambon = normThai(stop.tambon && stop.tambon !== 'CUSTOM' ? stop.tambon : '');
    const moo = stop.moo ? thaiDigitsToArabic(stop.moo).replace(/\D+/g, '') : '';

    if (vName) {
      const bareV = vName.replace(/^บ้าน/, '').trim();
      if (name === vName) {
        score += 140;
      } else if (name === bareV) {
        score += 110;
      } else if (name.startsWith(vName + ' ') || name.endsWith(' ' + vName)) {
        score += 85;
      } else if (name.includes(vName)) {
        // ระวัง "บ้านหนองตาดใหญ่" ชนะ "บ้านหนองตาด": ให้คะแนนน้อยกว่า exact match
        score += 45;
      } else if (bareV && combined.includes(bareV)) {
        score += 35;
      } else {
        score -= 40;
      }
      // โบนัสถ้าไม่ใช่โรงเรียน/วัด/อบต./รพ.สต. เมื่อกำลังหาตัวหมู่บ้าน
      if (/^(โรงเรียน|วัด|องค์การบริหาร|อบต\.|เทศบาล|รพ\.สต\.|สถานีอนามัย|ศูนย์พัฒนาเด็กเล็ก)/.test(name)) {
        score -= 45;
      }
    } else {
      const kw = normThai(stop.searchKeyword || stop.label || '');
      if (kw && combined.includes(kw)) score += 90;
      else {
        const toks = kw.split(' ').filter(function (t) { return t.length >= 2; });
        toks.forEach(function (t) {
          if (combined.includes(t)) score += 20;
        });
      }
    }

    if (tambon) {
      const hasTambon =
        addr.includes('ต.' + tambon) ||
        addr.includes('ตำบล' + tambon) ||
        addr.includes('ต. ' + tambon) ||
        addr.includes('ตำบล ' + tambon);
      if (hasTambon) {
        score += 95;
      } else if (combined.includes(tambon)) {
        score += 45;
      } else {
        // ต่างตำบล (เช่น บ้านโนนเมือง ต.สีดา vs ต.สามเมือง)
        score -= 65;
      }
    }

    if (moo) {
      const mooRe = new RegExp('(?:หมู่ที่|หมู่|ม\\.)\\s*0*' + moo + '(?!\\d)');
      if (mooRe.test(combined)) {
        score += 75;
      } else if (/(?:หมู่ที่|หมู่|ม\.)\s*\d+/.test(combined)) {
        score -= 35;
      }
    }

    if (expectAmphoe) {
      if (addr.includes('อ.' + expectAmphoe) || addr.includes('อำเภอ' + expectAmphoe) || addr.includes('เขต' + expectAmphoe)) score += 55;
      else if (combined.includes(expectAmphoe)) score += 25;
      else score -= 80;
    }

    if (expectProvince) {
      if (addr.includes(expectProvince) || (area.isSida && addr.includes('30430'))) score += 35;
      else if (combined.includes(expectProvince)) score += 20;
      else score -= 70;
    }

    if (area.isSida) {
      score += isInsideSidaBounds(lat, lon) ? 55 : -240;
    }

    return score;
  }

  function pickBestCandidate(candidates, stop) {
    if (!Array.isArray(candidates) || !candidates.length) {
      return { best: null, score: -9999, confidence: 'none' };
    }
    let best = null;
    let bestScore = -9999;
    candidates.forEach(function (item) {
      const sc = scoreSearchCandidate(item, stop);
      if (sc > bestScore) {
        bestScore = sc;
        best = item;
      }
    });
    let confidence = 'low';
    if (bestScore >= 200) confidence = 'high';
    else if (bestScore >= 80) confidence = 'medium';
    return { best: best, score: bestScore, confidence: confidence };
  }

  /** สร้าง URL ภาพแผนที่เส้นทางจาก Longdo/DOH snippet (ตรงตาม RouteResultPage.createSnippet 100%) */
  function buildSnippetUrl(places, opts) {
    const o = opts || {};
    const routeType = o.routeType || 'c';
    const avoidFerry = !!o.avoidFerry;
    const avoidTollway = !!o.avoidTollway;
    const typeVal = (avoidFerry ? 0 : 8) + (avoidTollway ? 0 : 16) + 1;
    const pathStr = places.map(function (p) {
      return Number(p.lat) + ',' + Number(p.lon);
    }).join('->');
    const pinBase = 'https://dohgis.doh.go.th/dohtotravel/images/pin';
    const markers = places.map(function (p, idx) {
      const pinNo = Math.min(idx + 1, 10);
      return 'marker=icon:' + pinBase + pinNo + '.png;position:' + Number(p.lat) + ',' + Number(p.lon) + ';offsetX:center;offsetY:bottom';
    }).join('&');
    return 'https://mmmap15.longdo.com/mmmap/snippet/?map=epsg3857&locale=th&height=325&width=650' +
      '&route=path:' + pathStr +
      ';linecolor:[road:purple|ferry:pink|air:FF83CD|tollroad:red|rail:brown]' +
      ';linewidth:[road:3|tollroad:3|other:5]' +
      ';mode:' + routeType +
      ';type:' + typeVal +
      '&' + markers;
  }

  /** สร้างบรรทัด "จาก ... ถึง ..." ตรงตาม DOH TO TRAVEL PDF */
  function buildRouteHeadline(places) {
    return 'จาก ' + places.map(function (p) {
      const name = String(p.name || '').trim();
      const addr = String(p.address || '').trim();
      if (addr && !name.includes(addr)) return (name + ' ' + addr).trim();
      return name || addr;
    }).join(' ถึง ');
  }

  function wrapThaiText(ctx, text, maxWidth) {
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (!raw) return [];
    let tokens = null;
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      try {
        const seg = new Intl.Segmenter('th', { granularity: 'word' });
        tokens = [];
        for (const part of seg.segment(raw)) {
          tokens.push(part.segment);
        }
      } catch (e) {
        tokens = null;
      }
    }
    if (!tokens) {
      tokens = raw.split(/(\s+)/);
    }

    const lines = [];
    let current = '';
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (!current && /^\s+$/.test(tok)) continue;
      const test = current + tok;
      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current.trim()) lines.push(current.trim());
        current = tok.replace(/^\s+/, '');
        // หากคำเดียวยาวเกิน maxWidth ให้ตัดทีละตัวอักษร
        while (current && ctx.measureText(current).width > maxWidth) {
          let cut = current.length - 1;
          while (cut > 1 && ctx.measureText(current.slice(0, cut)).width > maxWidth) cut--;
          lines.push(current.slice(0, cut));
          current = current.slice(cut);
        }
      }
    }
    if (current.trim()) lines.push(current.trim());
    return lines;
  }

  function loadImageFromSrc(src) {
    return new Promise(function (resolve, reject) {
      if (!src) { resolve(null); return; }
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function (err) { reject(err || new Error('Image load failed')); };
      img.src = src;
    });
  }

  /**
   * วาดภาพรายงานเส้นทางมาตรฐาน DOH TO TRAVEL ลงบน Canvas
   * รูปแบบเดียวกับหน้า 1 ของ PDF ที่พิมพ์จาก https://dohgis.doh.go.th/dohtotravel/
   */
  async function renderDohReportCardOnCanvas(canvas, payload) {
    const W = 960;
    const padX = 56;
    const innerW = W - padX * 2; // 848px
    const fontFamily = '"TH Sarabun New", "THSarabunNew", "Sarabun", "TH SarabunIT๙", "Leelawadee UI", "Tahoma", "Noto Sans Thai", sans-serif';

    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await Promise.all([
          document.fonts.load('400 27px "TH SarabunIT๙"').catch(function () {}),
          document.fonts.load('700 29px "TH SarabunIT๙"').catch(function () {}),
          document.fonts.load('400 27px "TH Sarabun New"').catch(function () {}),
          document.fonts.load('400 24px "Sarabun"').catch(function () {}),
          document.fonts.load('700 26px "Sarabun"').catch(function () {}),
          document.fonts.ready
        ]);
      } catch (e) { /* ignore */ }
    }

    const mapImg = await loadImageFromSrc(payload.mapDataUrl);
    let watermarkImg = null;
    if (payload.watermarkDataUrl) {
      try { watermarkImg = await loadImageFromSrc(payload.watermarkDataUrl); } catch (e) { watermarkImg = null; }
    }

    // วัดจำนวนบรรทัดของข้อความ "จาก ... ถึง ..."
    const measureCtx = canvas.getContext('2d');
    const bodyFontSize = 27;
    const lineHeight = 36;
    measureCtx.font = '400 ' + bodyFontSize + 'px ' + fontFamily;
    const routeLines = wrapThaiText(measureCtx, payload.routeHeadline || '', innerW);

    const headerTop = 50;
    const routeTop = headerTop + 44;
    const mapTop = routeTop + Math.max(1, routeLines.length) * lineHeight + 16;
    const mapAspect = (mapImg && mapImg.width > 0) ? (mapImg.height / mapImg.width) : 0.5;
    const mapW = innerW;
    const mapH = Math.round(mapW * mapAspect);
    const footerLine1Y = mapTop + mapH + 46;
    const footerLine2Y = footerLine1Y + 40;
    const H = footerLine2Y + 42;

    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // พื้นหลังสีขาวสะอาด
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // หัวเรื่องกึ่งกลาง (ตัวหนา)
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '700 29px ' + fontFamily;
    ctx.fillText('แนะนำเส้นทางโดย กรมทางหลวง กระทรวงคมนาคม', W / 2, headerTop);

    // ข้อความจุดเริ่มต้น -> จุดแวะ -> จุดกลับ
    ctx.textAlign = 'left';
    ctx.fillStyle = '#181818';
    ctx.font = '400 ' + bodyFontSize + 'px ' + fontFamily;
    for (let i = 0; i < routeLines.length; i++) {
      ctx.fillText(routeLines[i], padX, routeTop + i * lineHeight);
    }

    // ภาพแผนที่เส้นทางจาก DOH / Longdo Snippet
    if (mapImg) {
      ctx.drawImage(mapImg, padX, mapTop, mapW, mapH);
    }

    // เงื่อนไข + เวลาที่ใช้ + ระยะทาง (ตรงตามรายงาน PDF ของ DOH)
    ctx.fillStyle = '#181818';
    ctx.font = '400 26px ' + fontFamily;
    ctx.fillText('เงื่อนไข ' + (payload.routeTypeText || routeTypeLabel(payload.routeType)), padX, footerLine1Y);
    ctx.fillText(
      'เวลาที่ใช้ ' + (payload.durationText || '-') + ' ระยะทาง ' + (payload.distanceText || '-'),
      padX,
      footerLine2Y
    );

    // ลายน้ำกรมทางหลวงบางๆ กึ่งกลาง (ตรงตาม addWaterMark opacity 0.06-0.08 ใน DOH PDF)
    if (watermarkImg) {
      ctx.save();
      ctx.globalAlpha = 0.07;
      const wmSize = Math.min(520, Math.round(H * 0.72));
      const wmX = Math.round((W - wmSize) / 2);
      const wmY = Math.round((H - wmSize) / 2) + 48;
      ctx.drawImage(watermarkImg, wmX, wmY, wmSize, wmSize);
      ctx.restore();
    }

    return canvas.toDataURL('image/jpeg', 0.90);
  }

  const api = {
    SIDA_BOUNDS: SIDA_BOUNDS,
    thaiDigitsToArabic: thaiDigitsToArabic,
    normThai: normThai,
    floorKm: floorKm,
    distanceToUnit: distanceToUnit,
    intervalToUnit: intervalToUnit,
    routeTypeLabel: routeTypeLabel,
    isInsideSidaBounds: isInsideSidaBounds,
    isSidaOfficeStop: isSidaOfficeStop,
    isSidaDistrictStop: isSidaDistrictStop,
    buildSearchQueries: buildSearchQueries,
    scoreSearchCandidate: scoreSearchCandidate,
    pickBestCandidate: pickBestCandidate,
    buildSnippetUrl: buildSnippetUrl,
    buildRouteHeadline: buildRouteHeadline,
    wrapThaiText: wrapThaiText,
    renderDohReportCardOnCanvas: renderDohReportCardOnCanvas
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.__sidaDohLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
