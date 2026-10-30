/* MiniPDF — 외부 라이브러리 없이 A4 PDF를 만드는 작은 작성기 (Helvetica · Courier, WinAnsi) */
(function () {
  "use strict";
  var W = { H: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500], HB: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556] };
  var UNI = { 0x20AC: 128, 0x201A: 130, 0x0192: 131, 0x201E: 132, 0x2026: 133, 0x2020: 134, 0x2021: 135, 0x02C6: 136, 0x2030: 137, 0x0160: 138, 0x2039: 139, 0x0152: 140, 0x017D: 142, 0x2018: 145, 0x2019: 146, 0x201C: 147, 0x201D: 148, 0x2022: 149, 0x2013: 150, 0x2014: 151, 0x02DC: 152, 0x2122: 153, 0x0161: 154, 0x203A: 155, 0x0153: 156, 0x017E: 158, 0x0178: 159 };
  function code(ch) { var c = ch.charCodeAt(0); if (c >= 32 && c < 127) return c; if (c >= 160 && c <= 255) return c; return UNI[c] || 63; }
  var MM = 72 / 25.4, PH = 297;
  function f2(n) { return (Math.round(n * 100) / 100).toString(); }

  function Doc() { this.pages = []; this.cur = null; this.addPage(); }
  Doc.prototype.addPage = function () { this.cur = []; this.pages.push(this.cur); return this; };
  Doc.prototype.width = function (s, font, size) {
    s = String(s == null ? "" : s);
    if (font === "C") return s.length * 0.6 * size / MM;
    var t = W[font === "HB" ? "HB" : "H"], sum = 0;
    for (var i = 0; i < s.length; i++) { var c = code(s[i]); sum += t[c - 32] || 556; }
    return sum / 1000 * size / MM;
  };
  Doc.prototype.wrap = function (s, font, size, maxW) {
    var out = [], self = this;
    String(s == null ? "" : s).split("\n").forEach(function (para) {
      var words = para.split(/ +/), line = "";
      words.forEach(function (wd) {
        var tryL = line ? line + " " + wd : wd;
        if (self.width(tryL, font, size) <= maxW) { line = tryL; return; }
        if (line) out.push(line);
        // 한 단어가 너무 길면 글자 단위로 자름
        while (self.width(wd, font, size) > maxW && wd.length > 1) {
          var k = wd.length; while (k > 1 && self.width(wd.slice(0, k), font, size) > maxW) k--;
          out.push(wd.slice(0, k)); wd = wd.slice(k);
        }
        line = wd;
      });
      out.push(line);
    });
    return out;
  };
  Doc.prototype.color = function (rgb, stroke) { return rgb.map(function (v) { return f2(v / 255); }).join(" ") + (stroke ? " RG" : " rg"); };
  Doc.prototype.text = function (x, y, s, o) {
    o = o || {}; var font = o.font || "H", size = o.size || 9, str = String(s == null ? "" : s);
    if (o.align === "right") x -= this.width(str, font, size);
    else if (o.align === "center") x -= this.width(str, font, size) / 2;
    var enc = "";
    for (var i = 0; i < str.length; i++) {
      var c = code(str[i]);
      if (c === 40 || c === 41 || c === 92) enc += "\\" + String.fromCharCode(c);
      else if (c < 127) enc += String.fromCharCode(c);
      else enc += "\\" + ("00" + c.toString(8)).slice(-3);
    }
    var fid = font === "HB" ? "F2" : font === "C" ? "F3" : "F1";
    var cs = o.charSpace ? f2(o.charSpace) + " Tc " : "";
    if (o.charSpace && o.align === "center") x -= (str.length - 1) * o.charSpace / MM / 2;
    this.cur.push("BT " + this.color(o.color || [21, 35, 59]) + " /" + fid + " " + f2(size) + " Tf " + cs + f2(x * MM) + " " + f2((PH - y) * MM) + " Td (" + enc + ") Tj ET" + (o.charSpace ? " 0 Tc" : ""));
    return this;
  };
  Doc.prototype.line = function (x1, y1, x2, y2, o) {
    o = o || {};
    this.cur.push(this.color(o.color || [21, 35, 59], true) + " " + f2((o.width || 0.2) * MM) + " w " + f2(x1 * MM) + " " + f2((PH - y1) * MM) + " m " + f2(x2 * MM) + " " + f2((PH - y2) * MM) + " l S");
    return this;
  };
  Doc.prototype.rect = function (x, y, w, h, o) {
    o = o || {}; var r = f2(x * MM) + " " + f2((PH - y - h) * MM) + " " + f2(w * MM) + " " + f2(h * MM) + " re";
    if (o.fill) this.cur.push(this.color(o.fill) + " " + r + " f");
    if (o.stroke) this.cur.push(this.color(o.stroke, true) + " " + f2((o.width || 0.2) * MM) + " w " + r + " S");
    return this;
  };
  Doc.prototype.output = function () {
    var objs = [], self = this;
    objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    var fonts = "<< /F1 3 0 R /F2 4 0 R /F3 5 0 R >>";
    objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    objs[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>";
    var kids = [];
    this.pages.forEach(function (ops, i) {
      var pid = 6 + i * 2, cid = pid + 1, body = ops.join("\n");
      kids.push(pid + " 0 R");
      objs[pid] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font " + fonts + " >> /Contents " + cid + " 0 R >>";
      objs[cid] = "<< /Length " + body.length + " >>\nstream\n" + body + "\nendstream";
    });
    objs[2] = "<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + this.pages.length + " >>";
    var info = objs.length;
    var esc = function (v) { return String(v || "").replace(/[^\x20-\x7e]/g, "?").replace(/([()\\])/g, "\\$1"); };
    objs[info] = "<< /Title (" + esc(this.title || "Shipping documents") + ") /Producer (Shipping Docs Ledger) >>";
    var out = "%PDF-1.4\n", offs = [];
    for (var n = 1; n < objs.length; n++) { offs[n] = out.length; out += n + " 0 obj\n" + objs[n] + "\nendobj\n"; }
    var xref = out.length;
    out += "xref\n0 " + objs.length + "\n0000000000 65535 f \n";
    for (var m = 1; m < objs.length; m++) out += ("0000000000" + offs[m]).slice(-10) + " 00000 n \n";
    out += "trailer\n<< /Size " + objs.length + " /Root 1 0 R /Info " + info + " 0 R >>\nstartxref\n" + xref + "\n%%EOF";
    var bytes = new Uint8Array(out.length);
    for (var b = 0; b < out.length; b++) bytes[b] = out.charCodeAt(b) & 255;
    return new Blob([bytes], { type: "application/pdf" });
  };
  function supports(ch) { var c = ch.charCodeAt(0); return (c >= 32 && c < 127) || (c >= 160 && c <= 255) || !!UNI[c]; }
  window.MiniPDF = { create: function () { return new Doc(); }, supports: supports };
})();
