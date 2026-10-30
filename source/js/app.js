(function () {
  "use strict";

  /* =========================================================
     저장소 키
     ========================================================= */
  var K_DRAFT = "shipdocs-ledger-draft-v2";
  var K_DEALS = "shipdocs-ledger-deals-v1";
  var K_COMPANY = "shipdocs-ledger-company-v1";
  var K_OLD = "shipdocs-trio-draft-v1";

  function lsGet(k) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  /* =========================================================
     상태
     ========================================================= */
  function blankItem() {
    return { desc: "", hs: "", unit: "PCS", price: "", qty: "", shipQty: "", pcsCtn: "", nwCtn: "", gwCtn: "", lastNw: "", lastGw: "", l: "", w: "", h: "" };
  }
  function blankState() {
    return {
      dealId: null, isSample: false,
      meta: { piNo: "", piDate: "", validity: "", ciNo: "", ciDate: "", poNo: "", remarks: "", piRemarks: "" },
      parties: { consignee: "", notify: "" },
      lc: { date: "", bank: "", amount: "", latest: "", partial: "", transship: "" },
      piTerms: { packing: "Export standard carton", shipTime: "" },
      seller: { name: "", address: "", country: "", person: "", tel: "", email: "" },
      bank: { beneficiary: "", name: "", swift: "", account: "", address: "" },
      buyer: { name: "", address: "", country: "", person: "", tel: "", email: "" },
      terms: { incoterm: "FOB", place: "", payment: "T/T 100% in advance", currency: "USD", lcNo: "" },
      ship: { mode: "sea", vessel: "", pol: "", pod: "", etd: "", origin: "Republic of Korea", freight: "", insurance: "", insAuto: "", insurer: "", marks: "" },
      items: [blankItem()]
    };
  }
  function sampleState() {
    return {
      dealId: null, isSample: true,
      meta: { piNo: "PI-HM-2611-014", piDate: "2026-11-02", validity: "2026-12-02", ciNo: "CI-HM-2611-014", ciDate: "2026-11-20", poNo: "PO-DMP-4471", remarks: "Partial shipment of item 2. Balance of 20 PCS to follow on next vessel.", piRemarks: "Prices are firm until the validity date." },
      parties: { consignee: "TO ORDER OF BANCO EJEMPLO S.A.", notify: "Distribuidora Medica del Pacifico S.A. de C.V., Guadalajara, Mexico" },
      lc: { date: "2026-11-10", bank: "Banco Ejemplo S.A., Mexico City", amount: "168050", latest: "2026-11-30", partial: "allowed", transship: "prohibited" },
      piTerms: { packing: "Export standard carton", shipTime: "Within 20 days after receipt of L/C" },
      seller: { name: "Hanbit Medical Co., Ltd.", address: "88 Centum Jungang-ro, Haeundae-gu, Busan 48058", country: "Republic of Korea", person: "Gaeun Choi", tel: "+82-51-000-1234", email: "export@hanbit-medical.example" },
      bank: { beneficiary: "Hanbit Medical Co., Ltd.", name: "Example Bank, Busan Branch", swift: "EXAMKRSE", account: "000-000000-00-000", address: "Busan, Republic of Korea" },
      buyer: { name: "Distribuidora Medica del Pacifico S.A. de C.V.", address: "Av. Juarez 1450, Col. Centro, Guadalajara, Jalisco 44100", country: "Mexico", person: "Mariana Lopez", tel: "+52-33-0000-5678", email: "compras@dmp.example" },
      terms: { incoterm: "CIF", place: "Manzanillo", payment: "L/C at sight", currency: "USD", lcNo: "LC-MX-26-00873" },
      ship: { mode: "sea", vessel: "HYUNDAI BRAVE V.0412E", pol: "Busan, Korea", pod: "Manzanillo, Mexico", etd: "2026-11-24", origin: "Republic of Korea", freight: "2850", insurance: "", insurer: "", marks: "DMP\nVIA MANZANILLO\nGUADALAJARA\nC/NO. 1-UP\nMADE IN KOREA" },
      items: [
        { desc: "Patient Monitor HM-700 (12.1 inch)", hs: "9018.19", unit: "SET", price: "1240", qty: "120", shipQty: "120", pcsCtn: "2", nwCtn: "14.6", gwCtn: "17.2", l: "62", w: "48", h: "40" },
        { desc: "Fingertip Pulse Oximeter PO-20", hs: "9018.19", unit: "PCS", price: "38.5", qty: "500", shipQty: "480", pcsCtn: "50", nwCtn: "6.8", gwCtn: "8.1", lastNw: "4.1", lastGw: "5.2", l: "45", w: "35", h: "30" }
      ]
    };
  }
  // 이전 버전 상태도 받아 주기
  function str(v) { return v === null || v === undefined || typeof v === "object" ? "" : String(v); }
  function pick(dst, src) {
    if (!src || typeof src !== "object") return dst;
    Object.keys(dst).forEach(function (k) { if (k in src) dst[k] = str(src[k]); });
    return dst;
  }
  var OK_INCO = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];
  var OK_CUR = ["USD", "EUR", "JPY", "CNY", "GBP", "KRW"];
  var OK_MODE = ["sea", "air", "land"];
  var OK_UNIT = ["PCS", "SET", "EA", "UNIT", "BOX", "KG", "M"];
  function normalize(s) {
    var b = blankState();
    if (!s || typeof s !== "object") return b;
    ["meta", "seller", "bank", "buyer", "terms", "ship", "parties", "lc", "piTerms"].forEach(function (k) { pick(b[k], s[k]); });
    var T = blankState().terms, fixes = [];
    if (has(b.terms.incoterm) && OK_INCO.indexOf(b.terms.incoterm.toUpperCase()) < 0) fixes.push("인코텀즈 ‘" + b.terms.incoterm + "’ → " + T.incoterm);
    if (has(b.terms.currency) && OK_CUR.indexOf(b.terms.currency.toUpperCase()) < 0) fixes.push("통화 ‘" + b.terms.currency + "’ → " + T.currency);
    if (has(b.ship.mode) && OK_MODE.indexOf(b.ship.mode) < 0) fixes.push("운송 방식 ‘" + b.ship.mode + "’ → 해상");
    normalize.fixes = fixes;
    if (OK_INCO.indexOf(b.terms.incoterm.toUpperCase()) < 0) b.terms.incoterm = T.incoterm; else b.terms.incoterm = b.terms.incoterm.toUpperCase();
    if (OK_CUR.indexOf(b.terms.currency.toUpperCase()) < 0) b.terms.currency = T.currency; else b.terms.currency = b.terms.currency.toUpperCase();
    if (!has(b.terms.payment)) b.terms.payment = T.payment;
    else ensurePayOption(b.terms.payment);
    if (OK_MODE.indexOf(b.ship.mode) < 0) b.ship.mode = "sea";
    var src = Array.isArray(s.items) ? s.items.filter(function (it) { return it && typeof it === "object"; }) : [];
    b.items = src.length ? src.map(function (it) { var x = pick(blankItem(), it); x.unit = x.unit.toUpperCase(); if (OK_UNIT.indexOf(x.unit) < 0) x.unit = "PCS"; return x; }) : [blankItem()];
    b.dealId = s.dealId || null; b.isSample = !!s.isSample;
    return b;
  }

  var PAY_OPTIONS = [].map.call(document.querySelectorAll("#f_pay option"), function (o) { return o.value; });
  function ensurePayOption(v) {
    var sel = document.getElementById("f_pay"); if (!sel) return;
    if ([].some.call(sel.options, function (o) { return o.value === v; })) return;
    var o = document.createElement("option"); o.value = v; o.textContent = v + " (불러온 조건)"; sel.appendChild(o);
  }
  var state = normalize(lsGet(K_DRAFT) || lsGet(K_OLD) || sampleState());
  var currentDoc = "pi";
  var lastNeedBank = false, lastNeedLC = false;

  var saveTimer = null;
  function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(flushDraft, 300); }
  function flushDraft() { clearTimeout(saveTimer); saveTimer = null; lsSet(K_DRAFT, state); }
  window.addEventListener("pagehide", flushDraft);
  window.addEventListener("beforeunload", flushDraft);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flushDraft(); });

  /* =========================================================
     유틸
     ========================================================= */
  var $ = function (id) { return document.getElementById(id); };
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  // 받침에 따라 조사 고르기 (한글로 끝나지 않으면 뒤쪽 조사)
  function josa(w, a, b) { var c = String(w).charCodeAt(String(w).length - 1); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? a : b); }
  function has(v) { return v !== undefined && v !== null && String(v).trim() !== ""; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n, d) { return Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function fq(n) { return Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 3 }); }
  function decs() { return state.terms.currency === "KRW" || state.terms.currency === "JPY" ? 0 : 2; }
  function money(n) { return fmt(round(n, decs()), decs()); }
  function unitPrice(n) { var d = decs(); return Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: Math.max(d + 2, 4) }); }
  function round(n, d) {
    n = Number(n); if (!isFinite(n)) return 0;
    var s = String(Math.abs(n));
    var r = s.indexOf("e") > -1 ? Math.round(Math.abs(n) * Math.pow(10, d)) / Math.pow(10, d) : Number(Math.round(Number(s + "e" + d)) + "e-" + d);
    return n < 0 && r ? -r : r;
  }
  function getPath(o, p) { return p.split(".").reduce(function (a, k) { return a ? a[k] : undefined; }, o); }
  function setPath(o, p, v) { var ks = p.split("."), last = ks.pop(); ks.reduce(function (a, k) { return a[k]; }, o)[last] = v; }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(s) { if (!has(s)) return ""; var p = s.split("-"); return MON[parseInt(p[1], 10) - 1] + ". " + parseInt(p[2], 10) + ", " + p[0]; }
  function isoToday() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function addDays(iso, n) { var d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  var HANGUL = /[ㄱ-ㆎ가-힣]/;
  var NON_LATIN = /[^\x00-\xFF–—‘’“”]/;
  function badText(v) {
    if (!has(v)) return false;
    var s = String(v);
    for (var i = 0; i < s.length; i++) { var ch = s[i]; if (ch === "\n" || ch === "\r" || ch === "\t") continue; if (!window.MiniPDF || !window.MiniPDF.supports(ch)) return true; }
    return false;
  }

  /* ---------- 영문 숫자 ---------- */
  var ONES = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  var TENS = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
  function words(n) {
    n = Math.floor(n);
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
    if (n < 1000) return ONES[Math.floor(n / 100)] + " HUNDRED" + (n % 100 ? " " + words(n % 100) : "");
    if (n < 1e6) return words(n / 1000) + " THOUSAND" + (n % 1000 ? " " + words(n % 1000) : "");
    if (n < 1e9) return words(n / 1e6) + " MILLION" + (n % 1e6 ? " " + words(n % 1e6) : "");
    return words(n / 1e9) + " BILLION" + (n % 1e9 ? " " + words(n % 1e9) : "");
  }
  var CUR_NAME = { USD: ["US DOLLARS", "CENTS"], EUR: ["EUROS", "CENTS"], GBP: ["POUNDS STERLING", "PENCE"], CNY: ["CHINESE YUAN", "FEN"], JPY: ["JAPANESE YEN", ""], KRW: ["KOREAN WON", ""] };
  function moneyWords(n) {
    var c = CUR_NAME[state.terms.currency] || [state.terms.currency, "CENTS"];
    var neg = n < 0; n = Math.abs(round(n, decs()));
    var whole = Math.floor(n), cents = Math.round((n - whole) * 100);
    var s = "SAY TOTAL " + c[0] + " " + (neg ? "MINUS " : "") + words(whole);
    if (c[1] && cents > 0) s += " AND " + c[1] + " " + words(cents);
    return s + " ONLY.";
  }

  /* =========================================================
     인코텀즈 2020 기준표
     ========================================================= */
  var INCO = {
    EXW: { mode: "모든 운송", exp: "바이어", fr: "바이어", ins: "의무 없음", risk: "셀러 작업장에서 물품을 바이어 처분에 둘 때" },
    FCA: { mode: "모든 운송", exp: "셀러", fr: "바이어", ins: "의무 없음", risk: "지정 장소에서 바이어 지정 운송인에게 인도할 때" },
    FAS: { mode: "해상·내수로", exp: "셀러", fr: "바이어", ins: "의무 없음", risk: "선적항에서 본선 선측에 둘 때" },
    FOB: { mode: "해상·내수로", exp: "셀러", fr: "바이어", ins: "의무 없음", risk: "선적항에서 본선에 적재할 때" },
    CFR: { mode: "해상·내수로", exp: "셀러", fr: "셀러", ins: "의무 없음", risk: "선적항에서 본선에 적재할 때 (운임은 도착항까지 셀러)" },
    CIF: { mode: "해상·내수로", exp: "셀러", fr: "셀러", ins: "셀러 · ICC(C) 이상, 110%", risk: "선적항에서 본선에 적재할 때 (운임·보험은 도착항까지 셀러)" },
    CPT: { mode: "모든 운송", exp: "셀러", fr: "셀러", ins: "의무 없음", risk: "셀러가 계약한 운송인에게 인도할 때 (운임은 목적지까지 셀러)" },
    CIP: { mode: "모든 운송", exp: "셀러", fr: "셀러", ins: "셀러 · ICC(A), 110%", risk: "셀러가 계약한 운송인에게 인도할 때 (운임·보험은 목적지까지 셀러)" },
    DAP: { mode: "모든 운송", exp: "셀러", fr: "셀러", ins: "의무 없음 (위험은 셀러 부담)", risk: "목적지에서 양하 준비된 상태로 둘 때" },
    DPU: { mode: "모든 운송", exp: "셀러", fr: "셀러", ins: "의무 없음 (위험은 셀러 부담)", risk: "목적지에서 양하해 둘 때 (양하 비용·위험을 셀러가 지는 유일한 조건)" },
    DDP: { mode: "모든 운송", exp: "셀러", fr: "셀러", ins: "의무 없음 (위험은 셀러 부담)", risk: "목적지에서 양하 준비된 상태로 둘 때 (수입 통관·관세도 셀러)" }
  };
  var SEA_ONLY = ["FAS", "FOB", "CFR", "CIF"], C_TERMS = ["CFR", "CIF", "CPT", "CIP"], BUYER_FREIGHT = ["EXW", "FCA", "FAS", "FOB"], D_TERMS = ["DAP", "DPU", "DDP"];

  /* ---------- 컨테이너 대략 기준 (실적재 기준 추정치) ---------- */
  var CONTAINERS = [
    { name: "20ft", cbm: 28, kg: 28000 },
    { name: "40ft", cbm: 58, kg: 26500 },
    { name: "40ft HC", cbm: 68, kg: 26500 }
  ];

  /* ---------- 결제 조건 분할 ---------- */
  function splitDep(total, sp) { return round(total * sp.dep / 100, decs()); }
  function paySplit() {
    var m = /(\d+)%\s*deposit,\s*(\d+)%\s*(.+)$/i.exec(state.terms.payment);
    if (!m) return null;
    return { dep: +m[1], bal: +m[2], when: m[3] };
  }

  /* =========================================================
     계산
     ========================================================= */
  // 자투리 마지막 박스는 실측 중량이 있으면 그 값을 씀
  function lastW(ctns, last, pc, full, actual) {
    if (!ctns) return 0;
    var partial = pc > 0 && last < pc - 1e-9;
    return round((ctns - 1) * num(full) + (partial && has(actual) ? num(actual) : num(full)), 3);
  }
  function calc() {
    var rows = state.items.map(function (it, idx) {
      var qty = num(it.qty), ship = has(it.shipQty) ? num(it.shipQty) : qty, price = num(it.price), pc = num(it.pcsCtn);
      var ctns = pc > 0 ? Math.ceil(round(ship / pc, 6)) : 0;
      var last = ctns > 0 ? round(ship - (ctns - 1) * pc, 6) : 0;
      return {
        it: it, idx: idx, qty: qty, ship: ship, price: price,
        amtPI: round(qty * price, decs()), amtCI: round(ship * price, decs()),
        ctns: ctns, rem: pc > 0 && ctns > 0 && last < pc - 1e-9 ? last : 0,
        nw: lastW(ctns, last, pc, it.nwCtn, it.lastNw), gw: lastW(ctns, last, pc, it.gwCtn, it.lastGw),
        cbm: ctns * num(it.l) * num(it.w) * num(it.h) / 1e6
      };
    });
    var t = { qtyPI: 0, qtyCI: 0, amtPI: 0, amtCI: 0, ctns: 0, nw: 0, gw: 0, cbm: 0 };
    rows.forEach(function (r) { if (!has(r.it.desc)) return; t.qtyPI += r.qty; t.qtyCI += r.ship; t.amtPI += r.amtPI; t.amtCI += r.amtCI; t.ctns += r.ctns; t.nw += r.nw; t.gw += r.gw; t.cbm += r.cbm; });
    t.amtPI = round(t.amtPI, decs()); t.amtCI = round(t.amtCI, decs());
    var units = {}; state.items.forEach(function (it) { if (has(it.desc)) units[it.unit] = 1; });
    t.unitLabel = Object.keys(units).length === 1 ? Object.keys(units)[0] : "UNITS";
    function byUnit(field, shipOnly) {
      var m = {}, order = [];
      rows.forEach(function (r) { if (!has(r.it.desc)) return; var v = field === "qty" ? r.qty : r.ship; if (shipOnly && !(v > 0)) return; if (!(r.it.unit in m)) { m[r.it.unit] = 0; order.push(r.it.unit); } m[r.it.unit] += v; });
      return order.map(function (u) { return fq(round(m[u], 3)) + "\u00a0" + u; }).join(" / ") || "0";
    }
    t.qtyPIText = byUnit("qty"); t.qtyCIText = byUnit("ship", true);
    return { rows: rows, t: t };
  }

  /* =========================================================
     점검
     ========================================================= */
  var keyFieldList = null;
  function keyFields() { return keyFieldList || (keyFieldList = [].slice.call(document.querySelectorAll("#mainForm [data-k]"))); }
  function errsFor(list, types) { return list.filter(function (x) { return x.level === "err" && (!x.docs || types.some(function (d) { return x.docs.indexOf(d) > -1; })); }); }
  function modeLabels() {
    return state.ship.mode === "air" ? ["항공편 (Flight No.)", "출발 공항 (Airport of departure)", "도착 공항 (Airport of destination)", "출발 예정일 (Flight date)"]
      : state.ship.mode === "land" ? ["운송사·차량 (Carrier / Vehicle)", "적재지 (Place of loading)", "인도지 (Place of delivery)", "선적 예정일 (Shipment date)"]
      : ["선박명·항차 (Vessel / Voyage)", "선적항 (Port of loading)", "도착항 (Port of discharge)", "출항 예정일 (ETD)"];
  }
  function shortLbl(i) { return modeLabels()[i].split(" (")[0]; }
  // 입력 칸이 어느 서류에 찍히는지
  function FIELD_DOCS(k) {
    if (/^meta\.piRemarks$|^piTerms\.|^meta\.validity$|^bank\./.test(k)) return ["pi"];
    if (/^lc\.|^ship\.insurer$|^terms\.lcNo$/.test(k)) return ["ci"];
    if (/^parties\.|^meta\.remarks$|^meta\.ciNo$|^meta\.ciDate$|^ship\.marks$|^ship\.vessel$/.test(k)) return ["ci", "pl"];
    return undefined;
  }
  function checks(c) {
    var out = [];
    function add(level, text, target, docs) { out.push({ level: level, text: text, target: target, docs: docs }); }
    var T = state.terms, S = state.ship, M = state.meta, t = c.t, B = state.bank;

    if (!has(M.ciNo)) add("warn", "C/I 번호가 비어 있어요. P/I만 보낼 때는 괜찮지만 선적 전에는 필요합니다.", "f_ciNo");
    var req = [["meta.piNo", "P/I 번호", "f_piNo"], ["seller.name", "셀러 회사명", "f_sName"], ["buyer.name", "바이어 회사명", "f_bName"], ["ship.pol", shortLbl(1), "f_pol"], ["ship.pod", shortLbl(2), "f_pod"]];
    req.forEach(function (r) { if (!has(getPath(state, r[0]))) add("err", josa(r[1], "이", "가") + " 비어 있어요.", r[2]); });

    var badFields = [];
    keyFields().forEach(function (el) { if (badText(getPath(state, el.dataset.k))) badFields.push(el); });
    badFields.forEach(function (el) {
      var lab = el.closest(".field"); var name = lab ? lab.querySelector("span").textContent : el.id;
      add("err", name + ": PDF에 찍을 수 없는 글자(한글·일부 특수문자)가 있어요. 영문으로 바꿔 주세요.", el.id, FIELD_DOCS(el.dataset.k));
    });

    var valid = c.rows.filter(function (r) { return has(r.it.desc); });
    if (!valid.length) add("err", "품목이 하나 이상 필요합니다.", "items");
    c.rows.forEach(function (r, i) {
      var n = "품목 " + (i + 1), it = r.it;
      if (!has(it.desc) && !r.qty && !r.price) return;
      if (!has(it.desc)) add("err", n + ": 품명이 비어 있어요.", "it" + i + "_desc");
      if (badText(it.desc) || badText(it.hs)) add("err", n + ": 품명·HS 코드에 한글·특수문자가 있어 PDF에서 깨집니다.", "it" + i + "_desc");
      if (r.price <= 0) add("err", n + ": 단가가 0 이하이거나 비어 있어요.", "it" + i + "_price");
      if (r.qty <= 0) add("err", n + ": P/I 주문 수량이 0 이하이거나 비어 있어요.", "it" + i + "_qty");
      if (r.ship > r.qty && r.qty > 0) add("err", n + ": C/I·P/L 선적 수량(" + fq(r.ship) + ")이 P/I 주문 수량(" + fq(r.qty) + ")보다 많습니다.", "it" + i + "_shipQty");
      else if (r.ship !== r.qty && r.qty > 0) add("warn", n + ": P/I 수량 " + fq(r.qty) + " / C/I·P/L 수량 " + fq(r.ship) + "으로 다릅니다. 부분 선적이 아니라면 수량을 맞춰 주세요.", "it" + i + "_shipQty");
      if (!has(it.hs)) add("warn", n + ": HS 코드가 비어 있어요. C/I 통관 시 필요합니다.", "it" + i + "_hs");
      else if ([4, 6, 8, 10].indexOf(String(it.hs).replace(/[.\-\s]/g, "").length) < 0 || /[^\d.\-\s]/.test(it.hs)) add("info", n + ": HS 코드 형식을 확인하세요. 숫자 6자리(예: 9018.19) 또는 HSK 10자리(예: 9018.19-0000)입니다.", "it" + i + "_hs");
      if (num(it.pcsCtn) <= 0) add(r.ship > 0 ? "err" : "warn", n + ": 박스당 수량이 없어 P/L에 박스 0개·중량 0kg으로 찍힙니다. 포장 정보를 입력하세요.", "it" + i + "_pcsCtn", ["ci", "pl"]);
      else {
        if (has(it.lastNw) && has(it.lastGw) && num(it.lastGw) < num(it.lastNw)) add("err", n + ": 마지막 박스 총중량이 순중량보다 작습니다.", "it" + i + "_lastGw", ["ci", "pl"]);
        if ((has(it.lastNw) && num(it.lastNw) > num(it.nwCtn)) || (has(it.lastGw) && num(it.lastGw) > num(it.gwCtn))) add("warn", n + ": 마지막 박스 중량이 꽉 찬 박스보다 큽니다. 실측값을 확인하세요.", "it" + i + "_lastNw", ["ci", "pl"]);
        if (r.rem > 0 && (!has(it.lastNw) || !has(it.lastGw))) add("warn", n + ": 마지막 박스에는 " + fq(r.rem) + " " + it.unit + "만 들어가는데 중량이 꽉 찬 박스 기준으로 계산됐어요. ‘마지막 박스 순중량·총중량’에 실측값을 넣으세요.", "it" + i + "_lastNw", ["ci", "pl"]);
        if (num(it.nwCtn) <= 0 || num(it.gwCtn) <= 0) add(r.ship > 0 ? "err" : "warn", n + ": 박스당 순중량·총중량이 없어 P/L 중량이 0kg으로 찍힙니다.", "it" + i + "_nwCtn", ["ci", "pl"]);
        else if (num(it.gwCtn) < num(it.nwCtn)) add("err", n + ": 총중량(G.W.)이 순중량(N.W.)보다 작습니다.", "it" + i + "_gwCtn");
        if (!(num(it.l) > 0 && num(it.w) > 0 && num(it.h) > 0)) add("warn", n + ": 박스 크기가 없어 CBM이 0으로 표시됩니다.", "it" + i + "_l");
      }
    });
    if (c.rows.some(function (r) { return has(r.it.desc) && r.qty > 0 && r.qty !== r.ship; }) || t.amtPI !== t.amtCI) add("warn", "P/I 총액 " + T.currency + " " + money(t.amtPI) + " / C/I 총액 " + T.currency + " " + money(t.amtCI) + ". 품목별 수량이 다릅니다. 대조표 탭에서 확인하세요.", "tab_cmp");

    var inc = T.incoterm;
    if (!has(T.place)) add("warn", inc + " 뒤에 붙는 지정 장소가 비어 있어요. 예: " + inc + " " + (D_TERMS.indexOf(inc) > -1 || C_TERMS.indexOf(inc) > -1 ? "Manzanillo" : "Busan") + ".", "f_place");
    if (SEA_ONLY.indexOf(inc) > -1 && state.ship.mode !== "sea") add("err", inc + "는 해상·내수로 운송 전용 조건입니다. 항공·복합 운송이라면 " + ({ FAS: "FCA", FOB: "FCA", CFR: "CPT", CIF: "CIP" })[inc] + "를 검토하세요.", "f_inco");
    if (inc === "CIF" || inc === "CIP") {
      if (num(S.insurance) <= 0) add("warn", inc + "는 셀러가 보험을 부보하는 조건인데 보험 부보 금액이 비어 있어요. 최소 기준은 송장 금액의 110%입니다 (현재 " + T.currency + " " + money(t.amtCI * 1.1) + "). 110% 버튼으로 채울 수 있어요.", "f_ins");
      else if (t.amtCI > 0 && num(S.insurance) < t.amtCI * 1.1 - 0.005) add("warn", "보험 부보 금액이 C/I 금액의 " + fmt(num(S.insurance) / t.amtCI * 100, 1) + "%입니다. " + inc + "의 최소 부보 기준은 110%입니다.", "f_ins");
    } else if (num(S.insurance) > 0 && BUYER_FREIGHT.indexOf(inc) > -1) add("info", inc + "에서는 보험이 셀러 의무가 아닙니다. 별도 합의가 있는지 확인하세요.", "f_ins");
    if (C_TERMS.indexOf(inc) > -1 && num(S.freight) <= 0) add("warn", inc + "는 셀러가 운임을 부담합니다. 단가에 운임이 포함됐는지 확인하고 운임 금액을 적어 두세요.", "f_freight");
    if (BUYER_FREIGHT.indexOf(inc) > -1 && num(S.freight) > 0) add("warn", inc + "에서 주 운임은 바이어 부담입니다. 운임을 송장에 넣는 것이 맞는지 확인하세요.", "f_freight");
    if (inc === "EXW" && has(S.vessel)) add("info", "EXW는 바이어가 수출 통관·운송을 맡는 조건입니다. 선적 정보를 셀러가 적는 것이 맞는지 확인하세요.", "f_inco");

    if (/L\/C/.test(T.payment)) {
      var LC = state.lc;
      if (c.rows.some(function (r) { return has(r.it.desc) && r.qty > 0 && r.ship < r.qty; }) && LC.partial !== "allowed") add(LC.partial === "prohibited" ? "err" : "warn", "부분 선적인데 L/C의 부분 선적 조건(43P)이 ‘허용’으로 확인되지 않았어요. 금지된 L/C라면 은행이 서류를 반려합니다.", "f_lcPartial", ["ci", "pl"]);
      if (num(LC.amount) > 0 && t.amtCI > num(LC.amount) + 1e-9) add("err", "C/I 금액(" + money(t.amtCI) + ")이 L/C 금액(" + money(num(LC.amount)) + ")을 넘습니다. 은행이 반려할 수 있어요 (UCP 600 18조 b).", "f_lcAmount", ["ci"]);
      if (has(LC.latest) && has(S.etd) && S.etd > LC.latest) add("err", "출항 예정일이 L/C 최종 선적일(" + fmtDate(LC.latest) + ")보다 늦습니다.", "f_etd", ["ci", "pl"]);
      if (!has(state.parties.consignee)) add("info", "L/C 거래의 수하인(Consignee)은 보통 ‘TO ORDER OF [발행은행]’처럼 L/C에 적힌 대로 씁니다. 수하인 칸을 L/C와 맞추세요.", "f_consignee");
      add("info", "C/I의 상품명세는 L/C 45A의 문구와 일치해야 합니다 (UCP 600 18조 c). 품명을 L/C 그대로 적었는지 확인하세요.", "it0_desc");
    }
    if (inc === "DDP") add("warn", "DDP는 셀러가 수입국 통관·관세·부가세까지 부담합니다. 수입국에서 수입자로 등록할 수 없으면 사실상 이행이 어렵습니다.", "f_inco");
    if ((inc === "FOB" || inc === "CFR" || inc === "CIF") && S.mode === "sea") add("info", "컨테이너 화물이면 ICC는 " + inc + " 대신 " + ({ FOB: "FCA", CFR: "CPT", CIF: "CIP" })[inc] + "를 권장합니다. 벌크 화물이면 그대로 써도 됩니다.", "f_inco");
    if (/L\/C/.test(T.payment) && !has(T.lcNo)) add("warn", "L/C 결제인데 L/C 번호가 비어 있어요. C/I에 L/C 번호를 표시하는 경우가 많습니다.", "f_lc");
    if (/T\/T/.test(T.payment)) {
      if (!has(B.name) || !has(B.account) || !has(B.swift)) add("warn", "T/T 결제인데 입금 은행 정보(은행명·SWIFT·계좌번호)가 비어 있어요. P/I에 표시됩니다.", "f_bank");
      else if (!/^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test(B.swift.trim())) add("warn", "SWIFT 코드는 영문·숫자 8자리 또는 11자리입니다.", "f_swift");
    }

    if (has(M.piDate) && has(M.ciDate) && M.ciDate < M.piDate) add("warn", "C/I 발행일이 P/I 발행일보다 빠릅니다.", "f_ciDate");
    if (has(M.piDate) && has(M.validity) && M.validity < M.piDate) add("warn", "P/I 유효기간이 발행일보다 빠릅니다.", "f_validity");
    if (has(S.etd) && has(M.piDate) && S.etd < M.piDate) add("warn", josa(shortLbl(3), "이", "가") + " P/I 발행일보다 빠릅니다.", "f_etd");
    if (state.ship.mode !== "air" && t.cbm > CONTAINERS[2].cbm) add("info", "총 CBM이 40ft HC 한 대 기준(약 " + CONTAINERS[2].cbm + " CBM)을 넘습니다. 컨테이너 여러 대로 나눠야 합니다.", "containerFit");
    return out;
  }

  /* =========================================================
     서류 모델 (HTML·PDF 공통)
     ========================================================= */
  function partyLines(p) {
    var l = [];
    if (has(p.address)) l.push(p.address);
    if (has(p.country)) l.push(p.country);
    var c = []; if (has(p.person)) c.push("Attn: " + p.person); if (has(p.tel)) c.push("Tel: " + p.tel);
    if (c.length) l.push(c.join("  "));
    if (has(p.email)) l.push("Email: " + p.email);
    return l;
  }
  var MODE = { sea: "By sea", air: "By air", land: "By land / Multimodal" };

  // 화인의 C/NO. 1-UP 은 최종 서류에서 실제 박스 수로
  function marksFinal(marks, ctns) { return ctns > 0 ? String(marks || "").replace(/C\/NO\.?\s*1\s*-\s*UP/gi, "C/NO. 1-" + ctns) : marks; }
  function model(type, c) {
    var T = state.terms, S = state.ship, M = state.meta, t = c.t, cur = T.currency, B = state.bank;
    var L = S.mode === "air" ? { v: "Flight No.", pol: "Airport of Departure", pod: "Airport of Destination", etd: "Flight Date" } : S.mode === "land" ? { v: "Carrier / Vehicle", pol: "Place of Loading", pod: "Place of Delivery", etd: "Shipment Date" } : { v: "Vessel / Voyage", pol: "Port of Loading", pod: "Port of Discharge", etd: "Sailing on/about" };
    var termStr = T.incoterm + (has(T.place) ? " " + T.place : "") + " (Incoterms 2020)";
    var m = { type: type, sellerName: state.seller.name || "", shipper: { name: state.seller.name, lines: partyLines(state.seller) }, consignee: { name: state.buyer.name, lines: partyLines(state.buyer) }, notes: [] };
    var PT = state.parties, LC = state.lc, isLC = /L\/C/.test(T.payment);
    if (type !== "pi" && (has(PT.consignee) || has(PT.notify))) {
      var cl = has(PT.consignee) ? String(PT.consignee).split("\n") : [state.buyer.name];
      var extra = has(PT.consignee) ? cl.slice(1) : partyLines(state.buyer);
      if (has(PT.notify)) extra = extra.concat(["", "NOTIFY PARTY:"]).concat(String(PT.notify).split("\n"));
      if (has(PT.consignee) && has(state.buyer.name) && PT.consignee.toUpperCase().indexOf(state.buyer.name.trim().toUpperCase()) < 0) extra = extra.concat(["", "FOR ACCOUNT & RISK OF:", state.buyer.name]);
      m.consignee = { name: cl[0], lines: extra.filter(function (x, i, a) { return x !== "" || (i > 0 && a[i - 1] !== ""); }) };
    }
    var ALLOW = { allowed: "Allowed", prohibited: "Not allowed" };
    var rows = c.rows.filter(function (r) { return has(r.it.desc) && (type === "pi" || r.ship > 0); });

    if (type === "pi") {
      m.title = "PROFORMA INVOICE"; m.partyLabels = ["SELLER", "BUYER"];
      m.refs = [["P/I No.", M.piNo], ["Date", fmtDate(M.piDate)], ["Validity", fmtDate(M.validity)], ["Buyer's Ref.", M.poNo]];
      m.terms = [["Price Terms", termStr], ["Payment", T.payment], ["Shipment", MODE[S.mode] + (has(S.pol) ? ", from " + S.pol : "") + (has(S.pod) ? " to " + S.pod : "")], ["Time of Shipment", state.piTerms.shipTime || fmtDate(S.etd)], ["Partial Shipment", ALLOW[LC.partial]], ["Transshipment", ALLOW[LC.transship]], ["Packing", state.piTerms.packing], ["Origin", S.origin]];
      m.head = ["No.", "Description of Goods", "HS Code", "Quantity", "Unit Price (" + cur + ")", "Amount (" + cur + ")"];
      m.align = ["c", "l", "c", "r", "r", "r"];
      m.body = rows.map(function (r, i) { return [String(i + 1), r.it.desc, r.it.hs, fq(r.qty) + " " + r.it.unit, unitPrice(r.price), money(r.amtPI)]; });
      m.foot = ["", "TOTAL", "", t.qtyPIText, "", cur + " " + money(t.amtPI)];
      m.words = moneyWords(t.amtPI);
      var sp = paySplit();
      if (sp) m.notes.push("Deposit " + sp.dep + "%: " + cur + " " + money(splitDep(t.amtPI, sp)) + "   /   Balance " + sp.bal + "%: " + cur + " " + money(round(t.amtPI - splitDep(t.amtPI, sp), decs())) + " (" + sp.when + ")");
      if ((C_TERMS.indexOf(T.incoterm) > -1 || D_TERMS.indexOf(T.incoterm) > -1) && num(S.freight) > 0) m.notes.push("Price includes freight of " + cur + " " + money(num(S.freight)) + ".");
      if (T.incoterm === "CIF" || T.incoterm === "CIP") m.notes.push("Insurance: to be covered by seller for 110% of the commercial invoice value, " + (T.incoterm === "CIP" ? "Institute Cargo Clauses (A)" : "Institute Cargo Clauses (C)") + (isLC ? " or as required by L/C" : "") + ".");
      if (/T\/T/.test(T.payment) && (has(B.name) || has(B.account))) {
        m.bankTitle = "BANK INFORMATION (T/T REMITTANCE)";
        m.bank = [["Beneficiary", B.beneficiary || state.seller.name], ["Bank", B.name], ["SWIFT", B.swift], ["Account No.", B.account], ["Bank Address", B.address]].filter(function (x) { return has(x[1]); });
      } else if (isLC && has(B.name)) {
        m.bankTitle = "ADVISING BANK (PLEASE OPEN L/C THROUGH)";
        m.bank = [["Beneficiary", B.beneficiary || state.seller.name], ["Bank", B.name], ["SWIFT", B.swift], ["Bank Address", B.address]].filter(function (x) { return has(x[1]); });
      }
      m.sign = "Accepted by Buyer"; m.signCo = state.buyer.name; m.sign2 = "For and on behalf of"; m.sign2Co = state.seller.name;
      m.remarks = M.piRemarks;
    } else if (type === "ci") {
      m.title = "COMMERCIAL INVOICE"; m.partyLabels = ["SHIPPER / EXPORTER", "CONSIGNEE"];
      m.refs = [["Invoice No.", M.ciNo], ["Date", fmtDate(M.ciDate)], ["P/I No.", M.piNo], ["L/C No.", /L\/C/.test(T.payment) ? T.lcNo : ""], ["Buyer's Ref.", M.poNo]];
      m.terms = [[L.v, S.vessel], [L.pol, S.pol], [L.pod, S.pod], [L.etd, fmtDate(S.etd)], ["Terms of Delivery", termStr], ["Payment", T.payment], ["Country of Origin", S.origin]];
      m.head = ["No.", "Description of Goods", "HS Code", "Quantity", "Unit Price (" + cur + ")", "Amount (" + cur + ")"];
      m.align = ["c", "l", "c", "r", "r", "r"];
      m.body = rows.map(function (r, i) { return [String(i + 1), r.it.desc, r.it.hs, fq(r.ship) + " " + r.it.unit, unitPrice(r.price), money(r.amtCI)]; });
      m.foot = ["", "TOTAL", "", t.qtyCIText, "", cur + " " + money(t.amtCI)];
      m.words = moneyWords(t.amtCI);
      if (isLC && has(T.lcNo)) m.notes.push("Drawn under L/C No. " + T.lcNo + (has(LC.date) ? " dated " + fmtDate(LC.date) : "") + (has(LC.bank) ? " issued by " + LC.bank : "") + ".");
      m.notes.push("Total packages: " + fmt(t.ctns, 0) + " CTNS   N.W.: " + fmt(t.nw, 2) + " KG   G.W.: " + fmt(t.gw, 2) + " KG   Measurement: " + fmt(t.cbm, 3) + " CBM");
      if ((C_TERMS.indexOf(T.incoterm) > -1 || D_TERMS.indexOf(T.incoterm) > -1) && num(S.freight) > 0) m.notes.push("Freight included in the above amount: " + cur + " " + money(num(S.freight)));
      if (num(S.insurance) > 0) m.notes.push("Insured amount (110% of invoice value, not premium): " + cur + " " + money(num(S.insurance)) + (has(S.insurer) ? "  Policy/Insurer: " + S.insurer : ""));
      m.marks = marksFinal(S.marks, t.ctns); m.sign = "For and on behalf of"; m.signCo = state.seller.name; m.sign3 = "Authorized Signature";
    } else {
      m.title = "PACKING LIST"; m.partyLabels = ["SHIPPER / EXPORTER", "CONSIGNEE"];
      m.refs = [["Invoice No.", M.ciNo], ["Date", fmtDate(M.ciDate)], ["P/I No.", M.piNo], ["Buyer's Ref.", M.poNo]];
      m.terms = [[L.v, S.vessel], [L.pol, S.pol], [L.pod, S.pod], [L.etd, fmtDate(S.etd)], ["Country of Origin", S.origin]];
      m.head = ["No.", "Description of Goods", "Quantity", "Packages", "N.W. (KG)", "G.W. (KG)", "Meas. (CBM)"];
      m.align = ["c", "l", "r", "r", "r", "r", "r"];
      var ctnFrom = 1;
      m.body = rows.map(function (r, i) {
        var pcN = num(r.it.pcsCtn), lastN = ctnFrom + r.ctns - 1, range;
        if (r.ctns > 1 && r.rem > 0) range = "C/NO. " + ctnFrom + (r.ctns > 2 ? "-" + (lastN - 1) : "") + " @" + fq(pcN) + " " + r.it.unit + ", C/NO. " + lastN + " @" + fq(r.rem) + " " + r.it.unit;
        else if (r.ctns === 1 && r.rem > 0) range = "C/NO. " + ctnFrom + " @" + fq(r.rem) + " " + r.it.unit;
        else range = r.ctns > 0 ? "C/NO. " + ctnFrom + (r.ctns > 1 ? "-" + lastN : "") : "";
        ctnFrom += r.ctns;
        var sub = [range, num(r.it.l) > 0 ? fmt(num(r.it.l), 0) + "x" + fmt(num(r.it.w), 0) + "x" + fmt(num(r.it.h), 0) + " cm" : "", num(r.it.pcsCtn) > 0 ? fq(num(r.it.pcsCtn)) + " " + r.it.unit + "/CTN" : ""].filter(Boolean).join(", ");
        return [String(i + 1), r.it.desc + (sub ? "\n" + sub : ""), fq(r.ship) + " " + r.it.unit, fmt(r.ctns, 0) + " CTNS", fmt(r.nw, 2), fmt(r.gw, 2), fmt(r.cbm, 3)];
      });
      m.foot = ["", "TOTAL", t.qtyCIText, fmt(t.ctns, 0) + " CTNS", fmt(t.nw, 2), fmt(t.gw, 2), fmt(t.cbm, 3)];
      m.words = "SAY TOTAL " + words(t.ctns) + " (" + fmt(t.ctns, 0) + ") CARTONS ONLY.";
      m.marks = marksFinal(S.marks, t.ctns); m.sign = "For and on behalf of"; m.signCo = state.seller.name; m.sign3 = "Authorized Signature";
    }
    if (type !== "pi") m.remarks = M.remarks;
    m.refs = m.refs.filter(function (kv) { return has(kv[1]); });
    m.terms = m.terms.filter(function (kv) { return has(kv[1]); });
    return m;
  }

  /* =========================================================
     렌더: 서류 HTML
     ========================================================= */
  function docHTML(m, errCount) {
    function kv(list) { return list.map(function (p) { return '<div class="kv"><span>' + esc(p[0]) + "</span><b>" + esc(p[1]) + "</b></div>"; }).join(""); }
    function party(label, p) {
      return '<div class="d-box"><div class="d-label">' + esc(label) + '</div><div class="d-party"><b>' + (esc(p.name) || '<i class="d-empty" lang="ko">(회사명 미입력)</i>') + "</b>" + p.lines.map(function (l) { return "<div>" + esc(l) + "</div>"; }).join("") + "</div></div>";
    }
    function cell(c) { var parts = String(c).split("\n"); return esc(parts[0]) + (parts[1] ? "<small>" + esc(parts[1]) + "</small>" : ""); }
    var th = m.head.map(function (h, i) { return '<th class="a-' + m.align[i] + '">' + esc(h) + "</th>"; }).join("");
    var tb = m.body.length ? m.body.map(function (r) { return "<tr>" + r.map(function (c, i) { return '<td class="a-' + m.align[i] + '">' + cell(c) + "</td>"; }).join("") + "</tr>"; }).join("") : '<tr><td colspan="' + m.head.length + '" class="d-empty">품목을 입력하면 여기에 표시됩니다.</td></tr>';
    var tf = "<tr>" + m.foot.map(function (c, i) { return '<td class="a-' + m.align[i] + '">' + esc(c) + "</td>"; }).join("") + "</tr>";
    var stamp = errCount ? '<div class="paper-stamp is-draft">DRAFT<small lang="ko">오류 ' + errCount + '건</small></div>' : '<div class="paper-stamp">CHECKED<small lang="ko">점검 통과</small></div>';
    var h = stamp + '<div class="d-top"><div class="d-issuer">' + esc(m.sellerName) + '</div><h3 class="d-title">' + esc(m.title) + "</h3></div>";
    h += '<div class="d-grid">' + party(m.partyLabels[0], m.shipper) + '<div class="d-box">' + kv(m.refs) + "</div>" + party(m.partyLabels[1], m.consignee) + '<div class="d-box">' + kv(m.terms) + "</div></div>";
    h += '<div class="d-table-wrap"><table class="d-table"><thead><tr>' + th + "</tr></thead><tbody>" + tb + "</tbody><tfoot>" + tf + "</tfoot></table></div>";
    if (m.words) h += '<div class="d-words">' + esc(m.words) + "</div>";
    if (m.notes.length) h += '<div class="d-extra">' + m.notes.map(function (e) { return "<div>" + esc(e) + "</div>"; }).join("") + "</div>";
    if (m.bank && m.bank.length) h += '<div class="d-bank"><div class="d-label">' + esc(m.bankTitle || "BANK INFORMATION") + '</div>' + kv(m.bank) + "</div>";
    h += '<div class="d-bottom"><div>' + (has(m.marks) ? '<div class="d-label">SHIPPING MARKS</div><pre class="d-marks">' + esc(m.marks) + "</pre>" : "") + (has(m.remarks) ? '<div class="d-label">REMARKS</div><div class="d-remarks">' + esc(m.remarks) + "</div>" : "") + "</div>";
    h += '<div class="d-signs">' + (m.sign2 ? sig(m.sign2, m.sign2Co) : "") + sig(m.sign, m.signCo, m.sign3) + "</div></div>";
    return h;
    function sig(a, b, c3) { return '<div class="d-sign"><div>' + esc(a) + '</div><div class="d-sign-co">' + esc(b) + '</div><div class="d-sign-line"></div>' + (c3 ? "<div>" + esc(c3) + "</div>" : "") + "</div>"; }
  }

  /* ---------- 대조표 ---------- */
  function compareHTML(c) {
    var cur = state.terms.currency;
    var rows = c.rows.filter(function (r) { return has(r.it.desc); });
    if (!rows.length) return '<p class="d-empty">품목을 입력하면 대조표가 만들어집니다.</p>';
    function td(v, diff) { return '<td class="a-r' + (diff ? " cmp-diff" : "") + '">' + esc(v) + "</td>"; }
    var body = rows.map(function (r, i) {
      var dq = r.qty !== r.ship;
      return "<tr><td>" + (i + 1) + ". " + esc(r.it.desc) + "</td>" + td(fq(r.qty), dq) + td(fq(r.ship), dq) + td(fq(r.ship), false) +
        td(money(r.amtPI), dq) + td(money(r.amtCI), dq) + td(fmt(r.ctns, 0), false) + td(fmt(r.gw, 2), false) + "</tr>";
    }).join("");
    var t = c.t, dq = rows.some(function (r) { return r.qty !== r.ship; }) || t.amtPI !== t.amtCI;
    var foot = "<tr><td>TOTAL</td>" + td(t.qtyPIText, dq) + td(t.qtyCIText, dq) + td(t.qtyCIText, false) + td(money(t.amtPI), dq) + td(money(t.amtCI), dq) + td(fmt(t.ctns, 0), false) + td(fmt(t.gw, 2), false) + "</tr>";
    var verdict = dq ? '<p class="cmp-verdict is-diff">P/I와 C/I·P/L 사이에 다른 칸이 ' + rows.filter(function (r) { return r.qty !== r.ship; }).length + "개 품목에 있습니다. 부분 선적이면 Remarks에 사유를 적어 두세요.</p>" : '<p class="cmp-verdict">세 서류의 수량·금액이 모두 일치합니다. C/I와 P/L은 같은 데이터로 만들어져 항상 같습니다.</p>';
    return '<div class="cmp"><h3 class="cmp-title">서류 대조표</h3>' + verdict +
      '<div class="d-table-wrap"><table class="d-table cmp-table"><thead><tr><th rowspan="2" class="a-l">품목</th><th colspan="3">수량</th><th colspan="2">금액 (' + esc(cur) + ')</th><th colspan="2">P/L</th></tr>' +
      '<tr><th>P/I</th><th>C/I</th><th>P/L</th><th>P/I</th><th>C/I</th><th>박스</th><th>G.W. kg</th></tr></thead><tbody>' + body + "</tbody><tfoot>" + foot + "</tfoot></table></div></div>";
  }

  /* =========================================================
     렌더: 품목 입력
     ========================================================= */
  function itemsHTML() {
    return state.items.map(function (it, i) {
      function f(k, label, attrs, cls) {
        return '<label class="field ' + (cls || "") + '"><span>' + label + '</span><input id="it' + i + "_" + k + '" data-i="' + i + '" data-f="' + k + '" value="' + esc(it[k]) + '" ' + (attrs || "") + "></label>";
      }
      var N = 'type="number" min="0" step="any" inputmode="decimal"';
      var units = ["PCS", "SET", "EA", "UNIT", "BOX", "KG", "M"].map(function (u) { return "<option" + (u === it.unit ? " selected" : "") + ">" + u + "</option>"; }).join("");
      return '<div class="item-card" data-row="' + i + '">' +
        '<div class="item-head"><span class="item-no">' + String(i + 1).padStart(2, "0") + '</span><span class="item-calc" id="itcalc' + i + '"></span>' +
        '<span class="item-acts"><button type="button" class="btn-link" data-dup="' + i + '" aria-label="품목 ' + (i + 1) + ' 복제">복제</button>' +
        (i > 0 ? '<button type="button" class="btn-link" data-up="' + i + '" aria-label="품목 ' + (i + 1) + ' 위로 이동">↑</button>' : "") +
        (state.items.length > 1 ? '<button type="button" class="btn-link item-del" data-del="' + i + '" aria-label="품목 ' + (i + 1) + ' 삭제">삭제</button>' : "") + "</span></div>" +
        '<div class="grid g4">' +
        f("desc", "품명 (Description)", "", "span3") + f("hs", "HS 코드", 'placeholder="0000.00"') +
        '<label class="field"><span>단위</span><select id="it' + i + '_unit" data-i="' + i + '" data-f="unit">' + units + "</select></label>" +
        f("price", "단가", N) + f("qty", "P/I 주문 수량", N) + f("shipQty", "C/I·P/L 선적 수량", N + ' placeholder="= 주문 수량"') +
        f("pcsCtn", "박스당 수량", N) + f("nwCtn", "박스당 순중량 kg", N) + f("gwCtn", "박스당 총중량 kg", N) +
        f("lastNw", "마지막 박스 순중량 kg", N + ' placeholder="자투리일 때"') + f("lastGw", "마지막 박스 총중량 kg", N + ' placeholder="자투리일 때"') +
        '<div class="field dims dims3"><span>박스 크기 cm (가로 × 세로 × 높이)</span><div class="dims-row">' +
        '<input id="it' + i + '_l" data-i="' + i + '" data-f="l" value="' + esc(it.l) + '" ' + N + ' aria-label="가로 cm">' +
        '<input id="it' + i + '_w" data-i="' + i + '" data-f="w" value="' + esc(it.w) + '" ' + N + ' aria-label="세로 cm">' +
        '<input id="it' + i + '_h" data-i="' + i + '" data-f="h" value="' + esc(it.h) + '" ' + N + ' aria-label="높이 cm">' +
        "</div></div></div></div>";
    }).join("");
  }

  /* =========================================================
     전체 렌더
     ========================================================= */
  function fillForm() {
    document.querySelectorAll("#mainForm [data-k]").forEach(function (el) { var v = getPath(state, el.dataset.k); el.value = v == null ? "" : v; });
    $("items").innerHTML = itemsHTML();
  }

  var PROGRESS_FIELDS = ["meta.piNo", "meta.piDate", "meta.ciNo", "meta.ciDate", "seller.name", "seller.address", "seller.country", "buyer.name", "buyer.address", "buyer.country", "terms.place", "ship.pol", "ship.pod", "ship.etd", "ship.vessel", "ship.marks"];

  function refresh() {
    if (state.ship.insAuto === "1" && state.terms.incoterm !== "CIF" && state.terms.incoterm !== "CIP") { state.ship.insAuto = ""; state.ship.insurance = ""; var fx0 = $("f_ins"); if (fx0) fx0.value = ""; }
    if (state.ship.insAuto === "1") { var iv = ins110Value(); if (iv !== state.ship.insurance) { state.ship.insurance = iv; var fi = $("f_ins"); if (fi && document.activeElement !== fi) fi.value = iv; } }
    var c = calc(), cur = state.terms.currency, t = c.t;
    c.rows.forEach(function (r, i) { var el = $("itcalc" + i); if (el) el.textContent = cur + " " + money(r.amtCI) + " · " + fmt(r.ctns, 0) + " CTNS · " + fmt(r.cbm, 3) + " CBM"; });

    $("totals").innerHTML = [["C/I 총액", cur + " " + money(t.amtCI)], ["총 박스", fmt(t.ctns, 0) + " CTNS"], ["총중량", fmt(t.gw, 2) + " KG"], ["부피", fmt(t.cbm, 3) + " CBM"]]
      .map(function (p) { return '<div class="tot"><span>' + p[0] + "</span><b>" + esc(p[1]) + "</b></div>"; }).join("");

    // 컨테이너 적재 추정
    var LBL = modeLabels();
    var _unused = state.ship.mode === "air" ? ["항공편 (Flight No.)", "출발 공항 (Airport of departure)", "도착 공항 (Airport of destination)", "출발 예정일 (Flight date)"] : state.ship.mode === "land" ? ["운송사·차량 (Carrier / Vehicle)", "적재지 (Place of loading)", "인도지 (Place of delivery)", "선적 예정일 (Shipment date)"] : ["선박명·항차 (Vessel / Voyage)", "선적항 (Port of loading)", "도착항 (Port of discharge)", "출항 예정일 (ETD)"];
    ["f_vessel", "f_pol", "f_pod", "f_etd"].forEach(function (id, i) { var s = $(id).closest(".field").querySelector("span"); if (s.textContent !== LBL[i]) s.textContent = LBL[i]; });
    if (state.ship.mode === "air") {
      var volW = t.cbm * 1e6 / 6000, chg = Math.max(t.gw, volW);
      $("containerFit").innerHTML = '<div class="cf-head"><b>항공 운임 중량 추정</b><span>IATA 6,000 cm³/kg 기준 · 대략치</span></div>' +
        '<div class="cf-air"><span>총중량</span><b>' + fmt(t.gw, 1) + ' kg</b><span>부피 중량</span><b>' + fmt(volW, 1) + ' kg</b><span>운임 적용 중량</span><b class="cf-chg">' + fmt(Math.ceil(chg * 2) / 2, 1) + ' kg</b></div>' +
        '<p class="cf-foot">총중량과 부피 중량 중 큰 값에 운임이 붙습니다. 실제 적용 기준은 항공사·포워더에 확인하세요.</p>';
    } else
    $("containerFit").innerHTML = '<div class="cf-head"><b>컨테이너 적재 추정</b><span>부피 기준 · 대략치</span></div>' + CONTAINERS.map(function (k) {
      var p = t.cbm / k.cbm * 100, pw = t.gw / k.kg * 100, w = Math.min(p, 100);
      var cls = p > 100 ? "is-over" : p > 85 ? "is-full" : "";
      return '<div class="cf-row ' + cls + '"><span class="cf-name">' + k.name + '</span><div class="cf-bar"><i style="width:' + w.toFixed(1) + '%"></i></div><span class="cf-val">' + (p > 100 ? Math.ceil(p / 100) + "대 필요" : fmt(p, 0) + "%") + "</span></div>" + (pw > 100 ? '<div class="cf-note">총중량이 ' + k.name + " 적재 한도(약 " + fmt(k.kg, 0) + " kg)를 넘습니다.</div>" : "");
    }).join("") + '<p class="cf-foot">실적재 약 ' + CONTAINERS.map(function (k) { return k.name + " " + k.cbm; }).join(" / ") + " CBM 기준. 실제는 선사·화물 형태에 따라 다릅니다.</p>";

    // 점검
    var list = checks(c), counts = { err: 0, warn: 0, info: 0 };
    list.forEach(function (x) { counts[x.level]++; });
    var LBL = { err: "오류", warn: "확인", info: "참고" };
    var order = { err: 0, warn: 1, info: 2 };
    list.sort(function (a, b) { return order[a.level] - order[b.level]; });
    $("checksList").innerHTML = list.length ? list.map(function (x) {
      return '<li class="check check-' + x.level + '"><span class="check-tag">' + LBL[x.level] + '</span><button type="button" class="check-text" data-target="' + esc(x.target || "") + '">' + esc(x.text) + "</button></li>";
    }).join("") : '<li class="check check-ok"><span class="check-tag">통과</span><span class="check-text">세 서류의 수량·금액·중량이 일치하고 인코텀즈와 맞지 않는 항목이 없습니다.</span></li>';
    var live = "서류 점검: 오류 " + counts.err + "건, 확인 " + counts.warn + "건";
    if (live !== refresh.lastLive) { refresh.lastLive = live; clearTimeout(refresh.liveT); refresh.liveT = setTimeout(function () { $("checksLive").textContent = live; }, 1200); }
    // 12. 오류가 있는 칸 표시
    document.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
    list.forEach(function (x) { if (x.level === "err" && x.target) { var el = $(x.target); if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute("aria-invalid", "true"); } });
    $("checksCount").innerHTML = '<span class="cc cc-err">오류 ' + counts.err + '</span><span class="cc cc-warn">확인 ' + counts.warn + '</span><span class="cc cc-info">참고 ' + counts.info + "</span>";
    $("mbCount").textContent = counts.err + counts.warn;
    $("mbCount").className = counts.err ? "is-err" : counts.warn ? "is-warn" : "is-ok";

    // 단계별 상태
    var secState = {};
    list.forEach(function (x) {
      var el = x.target && $(x.target); var fs = el && el.closest ? el.closest("fieldset") : null;
      if (x.target === "items" || /^it\d/.test(x.target || "")) fs = $("sec6");
      if (!fs) return;
      var cur2 = secState[fs.id];
      if (x.level === "err" || (x.level === "warn" && cur2 !== "err")) secState[fs.id] = x.level === "err" ? "err" : (cur2 === "err" ? "err" : "warn");
    });
    var STL = { ok: "완료", warn: "확인 필요", err: "오류 있음" };
    document.querySelectorAll("#indexList a").forEach(function (a) { var st = secState[a.dataset.sec] || "ok"; if (a.dataset.state !== st) { a.dataset.state = st; var sr = a.querySelector(".sr"); if (!sr) { sr = document.createElement("span"); sr.className = "sr"; a.appendChild(sr); } sr.textContent = " · " + STL[st]; } });
    var filled = PROGRESS_FIELDS.filter(function (p) { return has(getPath(state, p)); }).length + (c.rows.some(function (r) { return has(r.it.desc) && r.qty > 0 && r.price > 0; }) ? 4 : 0);
    var pct = Math.round(filled / (PROGRESS_FIELDS.length + 4) * 100);
    $("progressText").textContent = "입력 " + pct + "%";
    $("progressBar").style.width = pct + "%";

    // 인코텀즈 안내
    var g = INCO[state.terms.incoterm];
    $("incoGuide").innerHTML = '<div class="ig-title"><b>' + state.terms.incoterm + '</b> 한눈에 보기 <span>Incoterms 2020</span></div><dl>' +
      "<dt>운송 방식</dt><dd>" + g.mode + "</dd><dt>수출 통관</dt><dd>" + g.exp + "</dd><dt>수입 통관</dt><dd>" + (state.terms.incoterm === "DDP" ? "셀러 (관세·부가세 포함)" : "바이어") + "</dd><dt>주 운임</dt><dd>" + g.fr + "</dd><dt>보험</dt><dd>" + g.ins + "</dd><dt>위험 이전</dt><dd>" + g.risk + "</dd></dl>";

    // 결제 분할
    var sp = paySplit();
    $("paySplit").hidden = !sp;
    if (sp) $("paySplit").innerHTML = '<span>선금 ' + sp.dep + '%</span><b>' + cur + " " + money(splitDep(t.amtPI, sp)) + '</b><span>잔금 ' + sp.bal + '%</span><b>' + cur + " " + money(round(t.amtPI - splitDep(t.amtPI, sp), decs())) + '</b><em>P/I 총액 기준, P/I 하단에 표시됩니다.</em>';
    $("lcField").classList.toggle("is-muted", !/L\/C/.test(state.terms.payment));
    $("bankBox").classList.toggle("is-needed", /T\/T/.test(state.terms.payment));
    var needBank = /T\/T/.test(state.terms.payment);
    if (needBank && !lastNeedBank && !(has(state.bank.name) && has(state.bank.account))) $("bankBox").open = true;
    lastNeedBank = needBank;
    var needLC = /L\/C/.test(state.terms.payment);
    if (needLC && !lastNeedLC && !(has(state.lc.date) && has(state.lc.bank))) $("lcBox").open = true;
    lastNeedLC = needLC; $("lcBox").classList.toggle("is-muted", !needLC);

    // 서류
    $("paper").innerHTML = currentDoc === "cmp" ? compareHTML(c) : docHTML(model(currentDoc, c), currentDoc === "cmp" ? 0 : errsFor(list, [currentDoc]).length);
    $("paper").classList.toggle("is-cmp", currentDoc === "cmp");
    fitPaper();
    $("pdfOne").disabled = currentDoc === "cmp" || !!saving; $("pdfAll").disabled = !!saving;
    $("pdfOne").textContent = currentDoc === "cmp" ? "대조표는 PDF가 없어요 · 서류 탭 선택" : "이 서류 PDF 저장";
    document.querySelectorAll(".doc-tab").forEach(function (b) { var on = b.dataset.doc === currentDoc; b.classList.toggle("is-on", on); b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; if (on) $("paper").setAttribute("aria-labelledby", b.id); });
    $("sampleChip").hidden = !state.isSample;
    var title = [state.buyer.name, state.meta.piNo].filter(has).join(" · ");
    $("dealTitle").textContent = title || "새 거래";
    updateSavedChip();
  }

  // 미리보기 서류를 칸 너비에 맞춰 축소 (너무 작아지면 가로 스크롤)
  function fitPaper() {
    var p = $("paper"), wrap = p.parentElement, ww = wrap.clientWidth; if (!ww) return;
    var key = ww + "|" + currentDoc + "|" + paperActual;
    if (currentDoc !== "cmp" && fitPaper.key === key) return;
    fitPaper.key = key;
    var pw = 600;
    if (currentDoc === "cmp") { p.style.zoom = ""; pw = p.offsetWidth; }
    var s = (ww - 2) / pw;
    var small = s < 0.78, actual = small && paperActual;
    p.style.zoom = s < 1 && !actual ? s.toFixed(3) : "";
    var tg = $("paperToggle"); tg.hidden = !small; tg.textContent = actual ? "화면에 맞추기" : "원래 크기로 보기";
  }
  var paperActual = false;
  $("paperToggle").addEventListener("click", function () { paperActual = !paperActual; fitPaper(); });
  window.addEventListener("resize", function () { clearTimeout(fitPaper.t); fitPaper.t = setTimeout(fitPaper, 120); });
  if (window.ResizeObserver) new ResizeObserver(function () { clearTimeout(fitPaper.t); fitPaper.t = setTimeout(fitPaper, 60); }).observe(document.querySelector(".paper-scroll"));

  var pending = 0;
  function markEdited(deferred) {
    state.isSample = false; persist();
    if (!deferred || (document.hasFocus && !document.hasFocus()) || document.visibilityState === "hidden") { refreshNow(); return; }
    if (pending) return;
    pending = (window.requestAnimationFrame || setTimeout)(function () { pending = 0; refresh(); });
  }
  function refreshNow() { if (pending) { (window.cancelAnimationFrame || clearTimeout)(pending); pending = 0; } refresh(); }

  /* =========================================================
     안내 바 (확인·알림)
     ========================================================= */
  var noticeTimer = null;
  function hideNotice() {
    var n = $("notice"), had = n.contains(document.activeElement);
    n.hidden = true; document.body.classList.remove("has-toast"); clearTimeout(noticeTimer);
    if (had) { var o = notice.opener; if (o && document.contains(o) && !o.closest("[hidden]")) o.focus(); else { var f = $("mainForm").querySelector("input,select,textarea"); if (f) f.focus({ preventScroll: true }); } }
  }
  function notice(msg, actions) {
    var n = $("notice"); clearTimeout(noticeTimer);
    var opener = document.activeElement && document.activeElement !== document.body && !n.contains(document.activeElement) ? document.activeElement : notice.opener;
    notice.opener = opener;
    var ask = actions && actions.some(function (a) { return a.label !== "되돌리기" && a.label !== "닫기"; });
    n.setAttribute("role", ask ? "alertdialog" : "status");
    n.setAttribute("aria-live", ask ? "assertive" : "polite");
    n.innerHTML = '<span class="notice-text" id="noticeText">' + esc(msg) + "</span>";
    if (ask) n.setAttribute("aria-labelledby", "noticeText"); else n.removeAttribute("aria-labelledby");
    (actions || []).forEach(function (a) {
      var b = document.createElement("button"); b.type = "button"; b.className = "btn btn-small " + (a.primary ? "btn-primary" : "btn-ghost"); b.textContent = a.label;
      b.addEventListener("click", function () {
        hideNotice();
        var moved = a.fn ? a.fn() : null;
        // 동작이 포커스를 옮기지 않았으면 원래 누른 버튼으로 되돌림
        setTimeout(function () { if (document.activeElement === document.body || !document.activeElement) { if (opener && document.contains(opener)) opener.focus(); else $("mainForm").querySelector("input,select,textarea").focus({ preventScroll: true }); } }, 0);
      }); n.appendChild(b);
    });
    n.hidden = false;
    if (ask) setTimeout(function () { var bs = n.querySelectorAll("button"), safe = [].filter.call(bs, function (x) { return x.textContent === "취소"; })[0] || bs[bs.length - 1]; if (safe) safe.focus(); }, 0);
    document.body.classList.add("has-toast"); document.body.style.setProperty("--toast-h", n.offsetHeight + "px");
    if (!ask) armNotice(actions && actions.length ? 12000 : 4500);
  }
  function armNotice(ms) { clearTimeout(noticeTimer); noticeTimer = setTimeout(function () { if (!$("notice").contains(document.activeElement)) hideNotice(); else armNotice(4000); }, ms); }

  /* =========================================================
     서류함
     ========================================================= */
  var dealsCache = null;
  function deals(fresh) { if (fresh || !dealsCache) dealsCache = lsGet(K_DEALS) || []; return dealsCache; }
  window.addEventListener("storage", function (e) {
    if (e.key === K_DEALS || e.key === null) { dealsCache = null; if (!$("drawer").hidden) renderDeals(); refresh(); }
  });
  function setDeals(list) { var clean = list.map(function (d) { return { id: d.id, name: d.name, savedAt: d.savedAt, state: d.state }; }); var r = lsSet(K_DEALS, clean); dealsCache = null; return r; }
  function dealName(s) { return [s.buyer.name, s.meta.piNo].filter(has).join(" · ") || "이름 없는 거래"; }
  function updateSavedChip() {
    var d = state.dealId ? deals().filter(function (x) { return x.id === state.dealId; })[0] : null;
    var chip = $("savedChip");
    if (!d) { chip.hidden = true; }
    else {
      if (d.__json === undefined) d.__json = JSON.stringify(strip(normalize(d.state)));
      var changed = d.__json !== JSON.stringify(strip(state));
      chip.hidden = false; chip.textContent = changed ? "저장 안 된 변경 있음" : "서류함에 저장됨";
      chip.classList.toggle("is-dirty", changed);
    }
    $("dealCount").textContent = deals().length;
  }
  // 저장 안 된 작업이 있는지 (예시·빈 양식·서류함과 같은 상태는 아님)
  function unsaved() {
    if (state.isSample) return false;
    var c = strip(state), empty = strip(blankState());
    var co = lsGet(K_COMPANY); if (co) { empty.seller = Object.assign(empty.seller, co.seller); empty.bank = Object.assign(empty.bank, co.bank); }
    empty.meta.piDate = c.meta.piDate; empty.meta.validity = c.meta.validity;
    if (JSON.stringify(c) === JSON.stringify(empty)) return false;
    var d = state.dealId ? deals().filter(function (x) { return x.id === state.dealId; })[0] : null;
    return !d || JSON.stringify(strip(normalize(d.state))) !== JSON.stringify(c);
  }
  function guard(fn, what) {
    if (!unsaved()) { fn(); return; }
    notice("서류함에 저장하지 않은 작성 내용이 있어요. " + what + " 지금 내용은 사라집니다.", [{ label: "계속", primary: true, fn: fn }, { label: "먼저 저장", fn: function () { saveDeal(); } }, { label: "취소" }]);
  }
  function strip(s) { var c = JSON.parse(JSON.stringify(s)); delete c.dealId; delete c.isSample; return c; }
  function saveDeal() {
    var list = deals(true).slice(), now = new Date().toISOString();
    if (!state.dealId) state.dealId = "d" + Date.now().toString(36);
    var entry = { id: state.dealId, name: dealName(state), savedAt: now, state: strip(state) };
    var i = list.findIndex(function (x) { return x.id === state.dealId; });
    if (i > -1) list[i] = entry; else list.unshift(entry);
    if (!setDeals(list)) { notice("이 브라우저에서는 저장할 수 없어요. 백업 파일 저장을 이용하세요."); return; }
    state.isSample = false; persist(); refresh(); renderDeals();
    var dup = has(state.meta.piNo) && list.some(function (x) { return x.id !== entry.id && x.state && x.state.meta && x.state.meta.piNo === state.meta.piNo; });
    notice("서류함에 저장했어요: " + entry.name + "." + (dup ? " 같은 P/I 번호(" + state.meta.piNo + ")로 저장된 다른 거래가 있으니 번호를 확인하세요." : ""));
  }
  function renderDeals() {
    var list = deals();
    $("dealList").innerHTML = list.length ? list.map(function (d) {
      var s = d.state, dt = new Date(d.savedAt);
      return '<li class="deal' + (d.id === state.dealId ? " is-current" : "") + '"><div class="deal-main"><b>' + esc(d.name) + "</b><span>" + esc(s.terms.incoterm + " " + (s.terms.place || "") + " · " + s.terms.currency + " · 품목 " + s.items.filter(function (x) { return has(x.desc); }).length + "개") + '</span></div><span class="deal-date">' + dt.toLocaleDateString("ko-KR") + " " + dt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) + '</span><div class="deal-acts"><button type="button" class="btn btn-small btn-ghost" data-open="' + d.id + '">열기</button><button type="button" class="btn-link" data-copy="' + d.id + '">복사해 새 건</button><button type="button" class="btn-link item-del" data-rm="' + d.id + '">삭제</button></div></li>';
    }).join("") : '<li class="deal-empty">저장한 거래가 없습니다. 작성 중인 서류에서 ‘서류함에 저장’을 누르면 여기에 쌓입니다.</li>';
    $("dealCount").textContent = list.length;
  }
  function openState(s, id) { hideNotice(); state = normalize(s); var fx = normalize.fixes || []; state.dealId = id || null; fillForm(); persist(); refresh();  if (fx.length) setTimeout(function () { var prev = $("notice").hidden ? "" : $("noticeText") ? $("noticeText").textContent + " " : ""; notice(prev + "지원하지 않는 값을 바꿨어요: " + fx.join(", ") + ". 서류를 확인하세요."); }, 0); }
  $("dealList").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var list = deals();
    if (b.dataset.open) { var d = list.filter(function (x) { return x.id === b.dataset.open; })[0]; if (d) guard(function () { openState(d.state, d.id); $("drawer").hidden = true; notice("거래를 열었어요: " + d.name + "."); }, "다른 거래를 열면"); }
    if (b.dataset.copy) {
      var d2 = list.filter(function (x) { return x.id === b.dataset.copy; })[0];
      if (d2) guard(function () { var s = JSON.parse(JSON.stringify(d2.state)); s.meta.piNo = ""; s.meta.ciNo = ""; s.meta.piDate = isoToday(); s.meta.ciDate = ""; s.meta.validity = addDays(isoToday(), 30); s.terms.lcNo = ""; s.ship.vessel = ""; s.ship.etd = "";
        if (s.lc) { s.lc.date = ""; s.lc.amount = ""; s.lc.latest = ""; }
        s.meta.remarks = ""; s.meta.poNo = ""; s.meta.piRemarks = ""; if (s.piTerms) s.piTerms.shipTime = ""; if (s.ship) { s.ship.insurer = ""; if (s.ship.insAuto !== "1") s.ship.insurance = ""; }
        (s.items || []).forEach(function (it) { it.shipQty = ""; it.lastNw = ""; it.lastGw = ""; });
        openState(s, null); setDrawer(false); $("autoNo").click(); $("f_piNo").focus({ preventScroll: true });
        notice("복사해 새 거래를 시작했어요. 번호 " + state.meta.piNo + ". P/O 번호·선박·출항일·L/C 정보·선적 수량·비고는 비웠고, 거래처·품목·단가·수하인·발행은행은 그대로예요."); }, "복사해 새 거래를 시작하면");
    }
    if (b.dataset.rm) {
      var d3 = list.filter(function (x) { return x.id === b.dataset.rm; })[0];
      notice("서류함에서 이 거래를 삭제할까요? " + (d3 ? d3.name : ""), [{ label: "삭제", primary: true, fn: function () { setDeals(deals(true).filter(function (x) { return x.id !== b.dataset.rm; })); if (state.dealId === b.dataset.rm) { state.dealId = null; persist(); } renderDeals(); refresh(); } }, { label: "취소" }]);
    }
  });
  $("btnSaveDeal").addEventListener("click", saveDeal);
  function setDrawer(open) { $("drawer").hidden = !open; $("btnDrawer").setAttribute("aria-expanded", open ? "true" : "false"); }
  $("btnDrawer").addEventListener("click", function () { deals(true); renderDeals(); setDrawer($("drawer").hidden); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!$("notice").hidden && $("notice").getAttribute("role") === "alertdialog") hideNotice();
    else if (!$("drawer").hidden) { setDrawer(false); $("btnDrawer").focus(); }
    else if (!$("notice").hidden) hideNotice();
  });
  $("drawerClose").addEventListener("click", function () { setDrawer(false); $("btnDrawer").focus(); });

  /* ---------- 내 회사 정보 ---------- */
  $("saveCompany").addEventListener("click", function () {
    if (!has(state.seller.name)) { $("companyNote").textContent = "회사명을 먼저 입력하세요."; return; }
    lsSet(K_COMPANY, { seller: state.seller, bank: state.bank });
    $("companyNote").textContent = "저장했어요. 새로 작성할 때 자동으로 채워집니다.";
  });
  $("loadCompany").addEventListener("click", function () {
    var co = lsGet(K_COMPANY);
    if (!co) { $("companyNote").textContent = "저장한 회사 정보가 없어요."; return; }
    state.seller = Object.assign(blankState().seller, co.seller); state.bank = Object.assign(blankState().bank, co.bank);
    fillForm(); markEdited(); $("companyNote").textContent = "회사 정보를 불러왔어요.";
  });

  /* ---------- 새로 작성 / 예시 ---------- */
  function startBlank() {
    hideNotice();
    state = blankState();
    var co = lsGet(K_COMPANY);
    if (co) { state.seller = Object.assign(state.seller, co.seller); state.bank = Object.assign(state.bank, co.bank); }
    state.meta.piDate = isoToday(); state.meta.validity = addDays(isoToday(), 30);
    fillForm(); persist(); refresh(); $("f_piNo").focus();
    notice(co ? "새 거래를 시작했어요. 저장한 회사 정보를 채워 두었습니다." : "새 거래를 시작했어요.");
  }
  $("btnNew").addEventListener("click", function () {
    if (!unsaved()) { startBlank(); return; }
    notice("서류함에 저장하지 않은 작성 내용이 있어요. 새로 시작하면 지금 내용은 사라집니다.", [{ label: "새로 시작", primary: true, fn: startBlank }, { label: "먼저 저장", fn: function () { saveDeal(); } }, { label: "취소" }]);
  });
  $("btnSample").addEventListener("click", function () { guard(function () { openState(sampleState(), null); notice("예시 데이터를 불러왔어요. 가상의 회사·거래입니다."); }, "예시를 불러오면"); });

  /* ---------- 백업 파일 ---------- */
  var downloadsP = (window.claude && window.claude.use) ? Promise.resolve(window.claude.use("downloads")).catch(function () { return null; }) : Promise.resolve(null);
  async function offerFile(name, data) {
    var dl = await downloadsP;
    if (dl) {
      try { await dl.save({ filename: name, data: data }); return "ok"; }
      catch (e) { return e && e.code === "declined" ? "declined" : (e && e.code === "rate_limited" ? "busy" : "fail"); }
    }
    try {
      var url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
      var a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000); return "ok";
    } catch (e2) { return "fail"; }
  }
  var exporting = false;
  $("btnExport").addEventListener("click", async function () {
    if (exporting) return; exporting = true;
    try { await exportInner(); } finally { exporting = false; }
  });
  async function exportInner() {
    var name = "shipdocs_" + (state.meta.piNo || "draft").replace(/[^A-Za-z0-9_-]+/g, "_") + ".json";
    var r = await offerFile(name, JSON.stringify({ app: "shipdocs-ledger", version: 1, state: strip(state) }, null, 2));
    notice(r === "ok" ? name + " 저장을 요청했어요." : r === "declined" ? "저장을 취소했어요." : r === "busy" ? "저장 창이 이미 열려 있어요." : "이 화면에서는 파일 저장을 쓸 수 없어요.");
  }
  $("importFile").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var j = JSON.parse(rd.result); var s = j.state || j;
        if (!s.meta || !s.items) throw new Error("bad");
        guard(function () { openState(s, null); $("drawer").hidden = true; notice("백업 파일을 불러왔어요. 서류함에 두려면 ‘서류함에 저장’을 누르세요."); }, "백업 파일을 불러오면");
      } catch (err) { notice("이 파일은 작성기 백업 파일이 아니에요. ‘현재 건 백업 파일 저장’으로 만든 .json 파일을 선택하세요."); }
      e.target.value = "";
    };
    rd.readAsText(f);
  });

  /* =========================================================
     입력 이벤트
     ========================================================= */
  $("mainForm").addEventListener("input", function (e) {
    var el = e.target;
    var typing = el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type !== "date");
    if (el.dataset.k) { setPath(state, el.dataset.k, el.value); if (el.dataset.k === "ship.insurance") state.ship.insAuto = ""; markEdited(typing); }
    else if (el.dataset.f) { state.items[+el.dataset.i][el.dataset.f] = el.value; markEdited(typing); }
  });
  $("mainForm").addEventListener("change", function (e) {
    var el = e.target;
    if (el.tagName === "SELECT") {
      if (el.dataset.k) setPath(state, el.dataset.k, el.value); else if (el.dataset.f) state.items[+el.dataset.i][el.dataset.f] = el.value;
      markEdited();
    }
  });
  $("mainForm").addEventListener("focusout", function () { if (pending) refreshNow(); });
  $("mainForm").addEventListener("submit", function (e) { e.preventDefault(); });

  $("items").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.del) {
      var di = +b.dataset.del, gone = state.items.splice(di, 1)[0];
      $("items").innerHTML = itemsHTML(); markEdited();
      var fb = $("it" + Math.max(0, di - 1) + "_desc"); if (fb) fb.focus({ preventScroll: true });
      notice("품목 " + (di + 1) + "을 삭제했어요" + (has(gone.desc) ? ": " + gone.desc : "") + ".", [{ label: "되돌리기", primary: true, fn: function () { state.items.splice(Math.min(di, state.items.length), 0, gone); $("items").innerHTML = itemsHTML(); markEdited(); var rf = $("it" + Math.min(di, state.items.length - 1) + "_desc"); if (rf) { rf.focus({ preventScroll: true }); rf.scrollIntoView({ block: "center" }); } } }, { label: "닫기" }]);
      return;
    }
    else if (b.dataset.dup) { var i = +b.dataset.dup; state.items.splice(i + 1, 0, Object.assign({}, state.items[i])); }
    else if (b.dataset.up) { var j = +b.dataset.up, tmp = state.items[j - 1]; state.items[j - 1] = state.items[j]; state.items[j] = tmp; }
    else return;
    $("items").innerHTML = itemsHTML(); markEdited();
  });
  $("addItem").addEventListener("click", function () {
    state.items.push(blankItem()); $("items").innerHTML = itemsHTML(); markEdited();
    var el = $("it" + (state.items.length - 1) + "_desc"); if (el) el.focus();
  });

  // 엑셀 붙여넣기
  $("togglePaste").addEventListener("click", function () { $("pasteBox").hidden = !$("pasteBox").hidden; if (!$("pasteBox").hidden) $("pasteArea").focus(); });
  // 따옴표를 고려해 한 줄을 나눔. 구분자는 따옴표 밖의 탭 > 세미콜론 > 쉼표 순서로 판단
  function splitLine(line) {
    var cnt = { "\t": 0, ";": 0, ",": 0 }, q = false, i;
    for (i = 0; i < line.length; i++) { var c = line[i]; if (c === '"') q = !q; else if (!q && c in cnt) cnt[c]++; }
    var sep = cnt["\t"] ? "\t" : cnt[";"] ? ";" : ",";
    var cols = [], cur = "", inq = false;
    for (i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') { if (inq && line[i + 1] === '"') { cur += '"'; i++; } else inq = !inq; }
      else if (ch === sep && !inq) { cols.push(cur); cur = ""; }
      else cur += ch;
    }
    cols.push(cur); cols.sep = sep; return cols;
  }
  // 숫자 칸: 1,234.50 / 1.234,50 / 38,5 / 1.250(유럽식 천 단위) 모두 처리
  function normNum(v, sep) { var r = normNum0(v, sep); return r.neg && r.v ? "-" + r.v : r.v; }
  function normNum0(v, sep) {
    var neg = /^\s*\(.*\)\s*$/.test(v) || /^\s*[\u2212\-]/.test(v) || /[\u2212\-]\s*$/.test(String(v).replace(/[^\d\u2212\-]+$/, ""));
    v = String(v).replace(/[()\u2212]/g, "").replace(/^\s*-/, "").replace(/[\s\u00a0]/g, "").replace(/^[^\d\-.,]+|[^\d.,]+$/g, "");
    var lc = v.lastIndexOf(","), ld = v.lastIndexOf(".");
    if (lc > -1 && ld > -1) return { neg: neg, v: lc > ld ? v.replace(/\./g, "").replace(",", ".") : v.replace(/,/g, "") };
    if (lc > -1) {
      if ((v.match(/,/g) || []).length > 1) return { neg: neg, v: v.replace(/,/g, "") };
      return { neg: neg, v: /^-?\d{1,3},\d{3}$/.test(v) && sep !== ";" ? v.replace(",", "") : v.replace(",", ".") };
    }
    if (ld > -1 && (v.match(/\./g) || []).length > 1) return { neg: neg, v: v.replace(/\./g, "") };
    if (ld > -1 && sep === ";" && /^-?\d{1,3}\.\d{3}$/.test(v)) return { neg: neg, v: v.replace(".", "") };
    return { neg: neg, v: v };
  }
  function parsePaste(text) {
    var keys = ["desc", "hs", "unit", "price", "qty", "pcsCtn", "nwCtn", "gwCtn", "l", "w", "h"];
    var lines = [], cur = "", q = false, src = String(text || "").replace(/\r\n?/g, "\n");
    for (var i = 0; i < src.length; i++) { var ch = src[i]; if (ch === '"') q = !q; if (ch === "\n" && !q) { lines.push(cur); cur = ""; } else cur += ch; }
    lines.push(cur);
    var nonEmpty = lines.filter(function (l) { return l.trim() !== ""; }).length;
    var res = lines.map(splitLine)
      .filter(function (cols) { return cols.join("").trim() !== ""; })
      .filter(function (cols) { return /\d/.test(String(cols[3] || "")) || /\d/.test(String(cols[4] || "")); })
      .map(function (cols) {
        var it = blankItem();
        keys.forEach(function (k, i) {
          var v = (cols[i] || "").trim();
          if (k !== "desc" && k !== "hs" && k !== "unit") v = normNum(v, cols.sep);
          if (v) it[k] = v;
        });
        it.desc = it.desc.replace(/\s*\n\s*/g, " ");
        it.unit = (it.unit || "PCS").toUpperCase(); if (OK_UNIT.indexOf(it.unit) < 0) it.unit = "PCS";
        it.shipQty = ""; return it;
      });
    res.skipped = nonEmpty - res.length;
    return res;
  }
  $("pasteApply").addEventListener("click", function () {
    var rows = parsePaste($("pasteArea").value);
    if (!rows.length) { notice("붙여넣은 내용에서 품목을 찾지 못했어요. 엑셀 열 순서(품명, HS, 단위, 단가, 수량…)를 확인하세요."); return; }
    var empty = state.items.length === 1 && !has(state.items[0].desc) && !has(state.items[0].qty);
    state.items = ($("pasteReplace").checked || empty) ? rows : state.items.concat(rows);
    $("items").innerHTML = itemsHTML(); $("pasteArea").value = ""; $("pasteBox").hidden = true; markEdited();
    notice("품목 " + rows.length + "개를 추가했어요." + (rows.skipped > 0 ? " 숫자가 없어 건너뛴 줄 " + rows.skipped + "개(머리글 등)가 있어요." : ""));
  });

  // 자동 번호·날짜·보험
  $("autoNo").addEventListener("click", function () {
    var d = (state.meta.piDate || isoToday()).replace(/-/g, "").slice(2);
    var pre = "PI-" + d + "-", max = 0;
    deals(true).map(function (x) { return x.state && x.state.meta ? x.state.meta.piNo : ""; }).concat([state.meta.piNo]).forEach(function (no) {
      if (String(no || "").indexOf(pre) === 0) { var k = parseInt(String(no).slice(pre.length), 10); if (k > max) max = k; }
    });
    var seq = String(max + 1).padStart(3, "0");
    if (!has(state.meta.piNo)) state.meta.piNo = "PI-" + d + "-" + seq;
    if (!has(state.meta.ciNo)) state.meta.ciNo = state.meta.piNo.replace(/^PI/, "CI");
    fillForm(); markEdited();
  });
  $("autoValidity").addEventListener("click", function () {
    if (!has(state.meta.piDate)) state.meta.piDate = isoToday();
    state.meta.validity = addDays(state.meta.piDate, 30); fillForm(); markEdited();
  });
  function ins110Value() { var a = calc().t.amtCI, p10 = Math.pow(10, decs()); return a > 0 ? String(Math.ceil(round(a * 1.1 * p10, 4)) / p10) : ""; }
  $("ins110").addEventListener("click", function () {
    var a = calc().t.amtCI; if (a <= 0) return;
    state.ship.insAuto = "1"; state.ship.insurance = ins110Value(); fillForm(); markEdited();
    notice("보험 금액을 C/I 금액의 110%로 채웠어요. 금액을 직접 고치기 전까지 C/I 금액이 바뀌면 함께 바뀝니다.");
  });

  // 점검 목록 → 해당 칸 이동
  function jumpTo(id) {
    var el = $(id); if (!el) return;
    if (id === "tab_cmp") { currentDoc = "cmp"; refresh(); el = $("previewBox"); }
    var det = el.closest && el.closest("details"); if (det) det.open = true;
    el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    var target = el.tagName === "FIELDSET" ? el.querySelector("input:not([type=file]),select,textarea") : el;
    if (target && target.focus) setTimeout(function () { target.focus({ preventScroll: true }); }, 250);
  }
  $("checksList").addEventListener("click", function (e) { var b = e.target.closest("[data-target]"); if (b && b.dataset.target) jumpTo(b.dataset.target); });
  $("indexList").addEventListener("click", function (e) { var a = e.target.closest("a"); if (!a) return; e.preventDefault(); jumpTo(a.dataset.sec); });
  $("mobileBar").addEventListener("click", function (e) { var b = e.target.closest("[data-jump]"); if (b) $(b.dataset.jump).scrollIntoView({ block: "start" }); });
  document.querySelectorAll(".doc-tab").forEach(function (b) { b.addEventListener("click", function () { currentDoc = b.dataset.doc; refresh(); }); });
  document.querySelector(".doc-tabs").addEventListener("keydown", function (e) {
    var tabs = [].slice.call(document.querySelectorAll(".doc-tab")), i = tabs.indexOf(document.activeElement); if (i < 0) return;
    var k = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key]; if (k === undefined) return;
    e.preventDefault(); var nb = tabs[(k + tabs.length) % tabs.length]; currentDoc = nb.dataset.doc; refresh(); nb.focus();
  });

  /* =========================================================
     화면 전환
     ========================================================= */
  function route() {
    var app = location.hash === "#app";
    $("intro").hidden = app; $("app").hidden = !app;
    $("navApp").hidden = app; $("navIntro").hidden = !app;
    document.body.classList.toggle("in-app", app);
    if (app) setTimeout(fitPaper, 0);
    window.scrollTo(0, 0);
  }
  function go(h) { if (location.hash === h) route(); else location.hash = h; }
  $("ctaStart").addEventListener("click", function () { go("#app"); });
  $("ctaStart2").addEventListener("click", function () { go("#app"); });
  $("navApp").addEventListener("click", function () { go("#app"); });
  $("ctaSample").addEventListener("click", function () { go("#app"); guard(function () { openState(sampleState(), null); }, "예시를 불러오면"); });
  $("navIntro").addEventListener("click", function () { go("#intro"); });
  $("brandLink").addEventListener("click", function (e) { e.preventDefault(); go("#intro"); });
  window.addEventListener("hashchange", route);

  /* =========================================================
     PDF
     ========================================================= */
  function flash(msg, bad) { var el = $("saveMsg"); el.textContent = msg; el.classList.toggle("is-bad", !!bad); }

  /* ---------- PDF 그리기 (MiniPDF) ---------- */
  var INK = [21, 35, 59], GRAY = [93, 106, 128], RULE = [160, 170, 186], HEAD = [232, 237, 245], FOOT = [244, 246, 250];
  var PL = 14, PR = 196, PCW = PR - PL, PBOTTOM = 276;

  function drawDocs(types, c) {
    var d = window.MiniPDF.create(), first = true;
    d.title = types.map(function (x) { return x.toUpperCase().replace("PI", "P/I").replace("CI", "C/I").replace("PL", "P/L"); }).join(" + ") + " " + ((types[0] === "pi" ? state.meta.piNo : state.meta.ciNo) || state.meta.piNo || "");
    types.forEach(function (t) {
      if (!first) d.addPage(); first = false;
      var start = d.pages.length - 1;
      drawOne(d, model(t, c));
      var n = d.pages.length - start, m = model(t, c), draft = errsFor(checks(c), [t]).length > 0;
      for (var i = 0; i < n; i++) {
        d.cur = d.pages[start + i];
        d.line(PL, 285, PR, 285, { color: RULE, width: 0.2 });
        d.text(PL, 289.5, m.title + "  |  " + ((t === "pi" ? state.meta.piNo : state.meta.ciNo) || "-"), { size: 7.2, color: GRAY });
        d.text(PR, 289.5, "Page " + (i + 1) + " of " + n, { size: 7.2, color: GRAY, align: "right" });
        if (draft) { d.rect(PR - 30, 9.5, 30, 8, { stroke: [180, 35, 24], width: 0.5 }); d.text(PR - 15, 15.2, "DRAFT", { font: "HB", size: 11, color: [180, 35, 24], align: "center", charSpace: 1.5 }); d.text(PR, 20.6, "NOT FOR SHIPMENT", { font: "HB", size: 6.4, color: [180, 35, 24], align: "right" }); }
      }
      d.cur = d.pages[d.pages.length - 1];
    });
    return d;
  }

  function drawOne(d, m) {
    var y;
    function header(cont) {
      d.text(PL, 14, m.sellerName || "", { size: 8.6, color: GRAY });
      d.text((PL + PR) / 2, cont ? 21 : 23, m.title + (cont ? " (continued)" : ""), { font: "HB", size: cont ? 12 : 16, align: "center", charSpace: cont ? 0.6 : 1.6 });
      d.line(PL, cont ? 24.5 : 27, PR, cont ? 24.5 : 27, { width: 0.6 });
      y = cont ? 29 : 31;
    }
    function ensure(h) { if (y + h > PBOTTOM) { d.addPage(); header(true); return true; } return false; }
    header(false);

    // 정보 박스 2x2
    var BW = PCW / 2, PAD = 2.2, LH = 3.6;
    function partyLines(label, p) {
      var out = [{ t: label, f: "HB", s: 7, c: GRAY }];
      d.wrap(p.name || "", "HB", 9, BW - PAD * 2).forEach(function (l) { out.push({ t: l, f: "HB", s: 9, c: INK, lh: 4 }); });
      p.lines.forEach(function (ln) { d.wrap(ln, "H", 8.2, BW - PAD * 2).forEach(function (l) { out.push({ t: l, f: "H", s: 8.2, c: INK }); }); });
      return out;
    }
    function kvLines(list) {
      var out = [], KW = 30;
      list.forEach(function (kv) {
        d.wrap(kv[1], "HB", 8.2, BW - PAD * 2 - KW).forEach(function (l, i) { out.push({ k: i === 0 ? kv[0] : "", t: l, f: "HB", s: 8.2, c: INK, kw: KW }); });
      });
      return out;
    }
    function boxH(lines) { return PAD * 2 + lines.reduce(function (a, l) { return a + (l.lh || LH); }, 0) + 0.6; }
    function drawBox(x, top, lines) {
      var yy = top + PAD + 2.6;
      lines.forEach(function (l) {
        if (l.kw) { if (l.k) d.text(x + PAD, yy, l.k, { size: 7.8, color: GRAY }); d.text(x + PAD + l.kw, yy, l.t, { font: l.f, size: l.s, color: l.c }); }
        else d.text(x + PAD, yy, l.t, { font: l.f, size: l.s, color: l.c });
        yy += l.lh || LH;
      });
    }
    [[partyLines(m.partyLabels[0], m.shipper), kvLines(m.refs)], [partyLines(m.partyLabels[1], m.consignee), kvLines(m.terms)]].forEach(function (row) {
      row = row.map(function (ls) { return ls.length > 40 ? ls.slice(0, 39).concat([{ t: "...", f: "H", s: 8.2, c: GRAY }]) : ls; });
      var h = Math.max(boxH(row[0]), boxH(row[1]));
      ensure(h);
      d.rect(PL, y, BW, h, { stroke: RULE }); d.rect(PL + BW, y, BW, h, { stroke: RULE });
      drawBox(PL, y, row[0]); drawBox(PL + BW, y, row[1]);
      y += h;
    });
    y += 5;

    // 품목 표
    var widths = m.type === "pl" ? [9, 0, 24, 22, 22, 22, 22] : [9, 0, 20, 26, 28, 32];
    var fixed = widths.reduce(function (a, b) { return a + b; }, 0); widths[1] = PCW - fixed;
    var xs = [PL]; widths.forEach(function (w, i) { xs[i + 1] = xs[i] + w; });
    var CP = 1.6;
    function cellX(i, a) { return a === "r" ? xs[i + 1] - CP : a === "c" ? xs[i] + widths[i] / 2 : xs[i] + CP; }
    var AL = { r: "right", c: "center", l: "left" };
    function drawRow(cells, o) {
      var font = o.font || "H", size = o.size || 8.2;
      var lines = cells.map(function (cv, i) {
        var parts = String(cv == null ? "" : cv).split("\n"), out = [];
        d.wrap(parts[0], font, size, widths[i] - CP * 2).forEach(function (l) { out.push({ t: l, s: size, c: INK, f: font }); });
        if (parts[1]) d.wrap(parts[1], "H", 7, widths[i] - CP * 2).forEach(function (l) { out.push({ t: l, s: 7, c: GRAY, f: "H" }); });
        // 한 칸이 한 페이지보다 길어지지 않도록 줄 수 제한
        if (out.length > 56) { out = out.slice(0, 55); out.push({ t: "... (continued text truncated)", s: 7, c: GRAY, f: "H" }); }
        return out;
      });
      var h = Math.max.apply(null, lines.map(function (ls) { return ls.reduce(function (a, l) { return a + (l.s > 7.5 ? 3.6 : 3.1); }, 0); })) + 2.6;
      if (ensure(h) && o.repeat) { o.repeat(); }
      if (o.fill) d.rect(PL, y, PCW, h, { fill: o.fill });
      cells.forEach(function (cv, i) {
        d.rect(xs[i], y, widths[i], h, { stroke: RULE });
        var yy = y + 3.6, a = o.align ? o.align[i] : "l";
        lines[i].forEach(function (l) { d.text(cellX(i, a), yy, l.t, { font: l.f, size: l.s, color: l.c, align: AL[a] }); yy += l.s > 7.5 ? 3.6 : 3.1; });
      });
      y += h;
    }
    function headRow() { drawRow(m.head, { font: "HB", size: 7.4, fill: HEAD, align: m.head.map(function () { return "c"; }) }); }
    headRow();
    var bodyRows = m.body.length ? m.body : [m.head.map(function () { return ""; })];
    bodyRows.forEach(function (r) { drawRow(r, { align: m.align, repeat: headRow }); });
    drawRow(m.foot, { font: "HB", fill: FOOT, align: m.align, repeat: headRow });
    y += 5;

    // 금액 영문 · 메모
    if (m.words) { d.wrap(m.words, "HB", 8.4, PCW).forEach(function (l) { ensure(4); d.text(PL, y, l, { font: "HB", size: 8.4 }); y += 4; }); y += 1; }
    m.notes.forEach(function (n) { d.wrap(n, "H", 8.2, PCW).forEach(function (l) { ensure(3.8); d.text(PL, y, l, { size: 8.2 }); y += 3.8; }); });
    if (m.bank && m.bank.length) {
      y += 2; var bw = PCW * 0.58, kw = 26, bl = [];
      m.bank.forEach(function (kv) { d.wrap(kv[1], "H", 8, bw - kw - 4).forEach(function (l, i) { bl.push([i ? "" : kv[0], l]); }); });
      var bh = 6.4 + bl.length * 3.7 + 1.5; ensure(bh);
      d.rect(PL, y, bw, 5, { fill: HEAD }); d.rect(PL, y, bw, bh, { stroke: RULE });
      d.text(PL + 2, y + 3.6, m.bankTitle || "BANK INFORMATION", { font: "HB", size: 7.6 });
      var by = y + 9;
      bl.forEach(function (r) { if (r[0]) d.text(PL + 2, by, r[0], { font: "HB", size: 7.8 }); d.text(PL + 2 + kw, by, r[1], { size: 8 }); by += 3.7; });
      y += bh;
    }
    y += 5;

    // 화인 · 비고
        if (has(m.marks)) {
      var ml = d.wrap(m.marks, "C", 8.4, PCW); ensure(5 + Math.min(ml.length, 3) * 3.8);
      d.text(PL, y, "SHIPPING MARKS", { font: "HB", size: 7.6, color: GRAY }); y += 4.2;
      ml.forEach(function (l) { ensure(3.8); d.text(PL, y, l, { font: "C", size: 8.4 }); y += 3.8; }); y += 2;
    }
    if (has(m.remarks)) {
      var rl = d.wrap(m.remarks, "H", 8.2, PCW); ensure(5 + Math.min(rl.length, 3) * 3.8);
      d.text(PL, y, "REMARKS", { font: "HB", size: 7.6, color: GRAY }); y += 4.2;
      rl.forEach(function (l) { ensure(3.8); d.text(PL, y, l, { size: 8.2 }); y += 3.8; });
    }

    // 서명
    var sigs = m.sign2 ? [[m.sign2, m.sign2Co], [m.sign, m.signCo]] : [[m.sign, m.signCo]];
    var sy = Math.max(y + 16, 250);
    if (sy + 14 > PBOTTOM + 6) { d.addPage(); header(true); sy = y + 16; }
    sigs.forEach(function (s, i) {
      var x = PR - 64 - (sigs.length - 1 - i) * 72;
      d.text(x, sy - 8, s[0], { size: 7.8, color: GRAY });
      d.wrap(s[1] || "", "HB", 8.2, 64).slice(0, 2).forEach(function (l, k) { d.text(x, sy - 4.2 + k * 3.7, l, { font: "HB", size: 8.2 }); });
      d.line(x, sy + 9, x + 64, sy + 9, { width: 0.3 });
      if (m.sign3 && i === sigs.length - 1) d.text(x, sy + 13, m.sign3, { size: 7.8, color: GRAY });
    });
  }

  var saving = false;
  async function savePdf(types) {
    if (saving) return;
    saving = true; $("pdfOne").disabled = true; $("pdfAll").disabled = true;
    try { await savePdfInner(types); }
    finally { saving = false; $("pdfAll").disabled = false; $("pdfOne").disabled = currentDoc === "cmp"; }
  }
  async function savePdfInner(types) {
    if (!window.MiniPDF) { flash("PDF 기능을 불러오지 못했어요. 페이지를 새로고침해 주세요.", true); return; }
    var c = calc(), errs = errsFor(checks(c), types);
    var blob;
    try { blob = drawDocs(types, c).output(); }
    catch (e) { flash("PDF를 만드는 중 문제가 생겼어요. 입력값을 확인하고 다시 시도하세요.", true); return; }
    var clean = function (s) { return (s || "draft").replace(/[^A-Za-z0-9_-]+/g, "_"); };
    var name = types.length > 1 ? "PI_CI_PL_" + clean(state.meta.ciNo || state.meta.piNo) + ".pdf" : ({ pi: "PI_", ci: "CI_", pl: "PL_" })[types[0]] + clean(types[0] === "pi" ? state.meta.piNo : state.meta.ciNo) + ".pdf";
    var r = await offerFile(name, blob);
    var note = errs.length ? " 점검 오류 " + errs.length + "건이 남아 있어요." : "";
    if (r === "ok") flash(name + " 저장을 요청했어요." + note, !!errs.length);
    else if (r === "declined") flash("저장을 취소했어요.");
    else if (r === "busy") flash("저장 창이 이미 열려 있어요. 잠시 후 다시 눌러 주세요.", true);
    else flash("이 화면에서는 파일 저장을 쓸 수 없어요.", true);
  }
  function askPdf(types) {
    var errs = errsFor(checks(calc()), types);
    if (!errs.length) { savePdf(types); return; }
    notice("이 서류에 점검 오류 " + errs.length + "건이 남아 있어요. 예: " + errs[0].text.replace(/[.\s]+$/, "").slice(0, 40) + ". 그래도 저장하면 해당 서류에 DRAFT 표시가 들어갑니다.", [{ label: "DRAFT로 저장", primary: true, fn: function () { savePdf(types); } }, { label: "오류 보기", fn: function () { $("checksBox").scrollIntoView({ block: "start" }); $("checksBox").focus({ preventScroll: true }); } }, { label: "취소" }]);
  }
  $("pdfOne").addEventListener("click", function () { if (currentDoc !== "cmp") askPdf([currentDoc]); });
  $("pdfAll").addEventListener("click", function () { askPdf(["pi", "ci", "pl"]); });

  /* =========================================================
     시작
     ========================================================= */
  fillForm(); refresh(); renderDeals(); route();
  window.__shipdocs = { calc: calc, checks: checks, model: model, words: moneyWords, parsePaste: parsePaste, sample: sampleState, compare: compareHTML };
})();
