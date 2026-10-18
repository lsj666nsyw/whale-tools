/**
 * core.js —— 工具箱核心逻辑（浏览器 / Node 双端可用）
 *
 * 只包含不依赖 DOM 的部分：PDF 合并拆分、Excel 合并拆分比对。
 * 图片处理需要 Canvas，放在 app.js（仅浏览器）。
 *
 * 用法：
 *   浏览器: <script src="libs/pdf-lib.min.js"> 等加载后 createToolbox({...})
 *   Node  : require('./core.js')（内部自动尝试 require 对应包）
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory;
  } else {
    root.createToolbox = factory;
  }
})(typeof self !== "undefined" ? self : this, function (deps) {
  "use strict";

  var PDFLib = deps.PDFLib;
  var XLSX = deps.XLSX;
  var JSZip = deps.JSZip;

  // ======================= 通用小工具 =======================
  function safeFileName(s, max) {
    s = String(s).replace(/[\\/:*?"<>|\r\n\t]+/g, "_").replace(/^\.+/, "").trim();
    if (!s) s = "未命名";
    return s.slice(0, max || 60);
  }

  function parseRanges(text, total) {
    if (!text || !text.trim()) return Array.from({ length: total }, function (_, i) { return i; });
    var out = {};
    var parts = text.trim().split(/[,，;；\s]+/);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!p) continue;
      var m = p.match(/^(\d+)\s*[-~]\s*(\d+)$/);
      if (m) {
        var a = +m[1], b = +m[2];
        if (a > b) { var t = a; a = b; b = t; }
        for (var k = a; k <= b; k++) if (k >= 1 && k <= total) out[k - 1] = 1;
      } else if (/^\d+$/.test(p)) {
        var n = +p;
        if (n >= 1 && n <= total) out[n - 1] = 1;
      } else {
        throw new Error("看不懂的页码：" + p + "（示例：1-3,5,8-10）");
      }
    }
    return Object.keys(out).map(Number).sort(function (x, y) { return x - y; });
  }

  function bufToUint(buf) {
    return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  }

  // ======================= PDF（pdf-lib） =======================
  async function mergePdfs(items) {
    // items: [{name, data(ArrayBuffer|Uint8Array)}]
    var out = await PDFLib.PDFDocument.create();
    var outline = [];
    var skipped = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      try {
        var src = await PDFLib.PDFDocument.load(bufToUint(it.data), { ignoreEncryption: false });
        var start = out.getPageCount();
        var pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach(function (p) { out.addPage(p); });
        outline.push({ title: it.name.replace(/\.[^.]+$/, ""), start: start, count: pages.length });
      } catch (e) {
        skipped.push({ name: it.name, reason: String(e.message || e) });
      }
    }
    if (!out.getPageCount()) {
      throw new Error("没有可合并的页面（可能都带密码或已损坏）");
    }
    // 注：pdf-lib 1.17 没有书签写入 API，网页版合并**不生成书签**
    // （outline 仅用于界面展示每个文件的起始页/页数）。
    // 需要书签请用桌面版 —— 这也是网页版给桌面版导流的一个差异点。
    var bytes = await out.save({ useObjectStreams: true });
    return { data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), outline: outline, skipped: skipped };
  }

  async function splitPdf(item, mode, opts) {
    // mode: 'each' | 'chunk' | 'range'
    opts = opts || {};
    var src = await PDFLib.PDFDocument.load(bufToUint(item.data));
    var total = src.getPageCount();
    var results = [];
    var stem = safeFileName(item.name.replace(/\.[^.]+$/, ""));

    function makeDoc(indices) {
      return PDFLib.PDFDocument.create().then(function (out) {
        return out.copyPages(src, indices).then(function (pages) {
          pages.forEach(function (p) { out.addPage(p); });
          return out.save({ useObjectStreams: true });
        });
      });
    }

    if (mode === "each") {
      for (var i = 0; i < total; i++) {
        var bytes1 = await makeDoc([i]);
        results.push({ name: stem + "_第" + (i + 1) + "页.pdf", data: bytes1 });
      }
    } else if (mode === "chunk") {
      var n = Math.max(1, opts.pagesPerFile || 10);
      var part = 0;
      for (var s = 0; s < total; s += n) {
        var e = Math.min(s + n, total);
        var idx = [];
        for (var k = s; k < e; k++) idx.push(k);
        var bytes2 = await makeDoc(idx);
        part++;
        results.push({ name: stem + "_第" + part + "部分_p" + (s + 1) + "-" + e + ".pdf", data: bytes2 });
      }
    } else if (mode === "range") {
      var idxs = parseRanges(opts.ranges || "", total);
      if (!idxs.length) throw new Error("没有选中任何页");
      var bytes3 = await makeDoc(idxs);
      results.push({ name: stem + "_提取" + idxs.length + "页.pdf", data: bytes3 });
    }
    return { total: total, results: results };
  }

  async function pdfInfo(data) {
    var doc = await PDFLib.PDFDocument.load(bufToUint(data), { ignoreEncryption: true });
    return { pages: doc.getPageCount() };
  }

  // ======================= Excel（SheetJS） =======================
  function readWorkbook(dataOrStr) {
    return XLSX.read(dataOrStr, { type: "array", cellDates: true });
  }

  function sheetRows(wb, sheetName) {
    var ws = wb.Sheets[sheetName];
    var aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
    if (!aoa.length) return { header: [], rows: [] };
    var header = aoa[0].map(function (c) { return String(c).trim(); });
    return { header: header, rows: aoa.slice(1) };
  }

  function aoaToWorkbook(aoa, sheetTitle) {
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, safeFileName(sheetTitle || "Sheet1", 30));
    return wb;
  }

  function wbToBuffer(wb) {
    return XLSX.write(wb, { bookType: "xlsx", type: "array" });
  }

  async function mergeExcel(items) {
    // items: [{name, data}]，全部取第一个工作表，表头按列名匹配
    var allHeader = null;
    var allRows = [];
    var perFile = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      try {
        var wb = readWorkbook(bufToUint(it.data));
        var r = sheetRows(wb, wb.SheetNames[0]);
        if (!r.header.length) { perFile.push({ name: it.name, rows: 0, note: "空表" }); continue; }
        if (!allHeader) { allHeader = r.header.slice(); allHeader.push("来源文件"); }
        var map = {};
        r.header.forEach(function (h, idx) {
          var di = allHeader.indexOf(h);
          if (di >= 0) map[idx] = di;
        });
        var got = 0;
        r.rows.forEach(function (row) {
          if (row.every(function (v) { return v === "" || v == null; })) return;
          var outRow = new Array(allHeader.length).fill("");
          Object.keys(map).forEach(function (si) { outRow[map[si]] = row[si]; });
          outRow[allHeader.length - 1] = it.name;
          allRows.push(outRow);
          got++;
        });
        perFile.push({ name: it.name, rows: got });
      } catch (e) {
        perFile.push({ name: it.name, rows: 0, note: String(e.message || e) });
      }
    }
    if (!allHeader) throw new Error("没有读取到任何数据");
    var aoa = [allHeader].concat(allRows);
    var wb2 = aoaToWorkbook(aoa, "合并结果");
    return { data: wbToBuffer(wb2), rows: allRows.length, perFile: perFile };
  }

  async function splitExcel(item, keyHeader) {
    var wb = readWorkbook(bufToUint(item.data));
    var r = sheetRows(wb, wb.SheetNames[0]);
    var ki = r.header.indexOf(keyHeader);
    if (ki < 0) throw new Error("找不到列：" + keyHeader);
    var groups = {};
    var order = [];
    r.rows.forEach(function (row) {
      if (row.every(function (v) { return v === "" || v == null; })) return;
      var key = String(row[ki] == null ? "" : row[ki]).trim() || "(空值)";
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(row);
    });
    if (order.length > 300) throw new Error("分组太多（" + order.length + "），请检查拆分列");
    var results = order.map(function (key) {
      var aoa = [r.header].concat(groups[key]);
      return { name: safeFileName(item.name.replace(/\.[^.]+$/, "")) + "_" + safeFileName(key) + ".xlsx", data: wbToBuffer(aoaToWorkbook(aoa, "数据")) };
    });
    return { results: results, groups: order.length };
  }

  async function compareExcel(itemA, itemB, keyHeaders) {
    var wbA = readWorkbook(bufToUint(itemA.data));
    var wbB = readWorkbook(bufToUint(itemB.data));
    var a = sheetRows(wbA, wbA.SheetNames[0]);
    var b = sheetRows(wbB, wbB.SheetNames[0]);
    if (!keyHeaders.length) throw new Error("请选择至少一个关键列");
    function keyOf(row, header) {
      return keyHeaders.map(function (h) {
        var i = header.indexOf(h);
        var v = i >= 0 && row[i] != null ? row[i] : "";
        return typeof v === "number" && v % 1 === 0 ? String(v) : String(v).trim();
      }).join("|");
    }
    var mapA = {}, mapB = {};
    a.rows.forEach(function (r) { if (r.some(function (v) { return v !== "" && v != null; })) (mapA[keyOf(r, a.header)] = mapA[keyOf(r, a.header)] || []).push(r); });
    b.rows.forEach(function (r) { if (r.some(function (v) { return v !== "" && v != null; })) (mapB[keyOf(r, b.header)] = mapB[keyOf(r, b.header)] || []).push(r); });
    var onlyA = [], onlyB = [], diffs = [];
    Object.keys(mapA).forEach(function (k) { if (!mapB[k]) onlyA = onlyA.concat(mapA[k]); });
    Object.keys(mapB).forEach(function (k) { if (!mapA[k]) onlyB = onlyB.concat(mapB[k]); });
    Object.keys(mapA).forEach(function (k) {
      if (!mapB[k]) return;
      var ra = mapA[k][0], rb = mapB[k][0];
      a.header.forEach(function (h, ci) {
        if (keyHeaders.indexOf(h) >= 0) return;
        var bi = b.header.indexOf(h);
        if (bi < 0) return;
        var va = String(ra[ci] == null ? "" : ra[ci]).trim();
        var vb = String(rb[bi] == null ? "" : rb[bi]).trim();
        if (va !== vb) diffs.push([k, h, va, vb]);
      });
    });
    var wbOut = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbOut, XLSX.utils.aoa_to_sheet([a.header].concat(onlyA)), "仅在A中");
    XLSX.utils.book_append_sheet(wbOut, XLSX.utils.aoa_to_sheet([b.header].concat(onlyB)), "仅在B中");
    XLSX.utils.book_append_sheet(wbOut, XLSX.utils.aoa_to_sheet([["关键值", "字段", "A的值", "B的值"]].concat(diffs)), "值有差异");
    XLSX.utils.book_append_sheet(wbOut, XLSX.utils.aoa_to_sheet([
      ["项目", "数量"],
      ["A表行数", a.rows.length], ["B表行数", b.rows.length],
      ["仅在A中", onlyA.length], ["仅在B中", onlyB.length], ["值不同", diffs.length],
    ]), "汇总");
    return { data: XLSX.write(wbOut, { bookType: "xlsx", type: "array" }), onlyA: onlyA.length, onlyB: onlyB.length, diffs: diffs.length };
  }

  async function excelHeaders(item) {
    var wb = readWorkbook(bufToUint(item.data));
    return sheetRows(wb, wb.SheetNames[0]).header.filter(Boolean);
  }

  // ======================= 打包 zip =======================
  async function zipFiles(files) {
    var zip = new JSZip();
    var used = {};
    files.forEach(function (f) {
      var name = f.name;
      if (used[name]) {
        var dot = name.lastIndexOf(".");
        var stem = dot > 0 ? name.slice(0, dot) : name;
        var ext = dot > 0 ? name.slice(dot) : "";
        var i = 2;
        while (used[stem + "_" + i + ext]) i++;
        name = stem + "_" + i + ext;
      }
      used[name] = 1;
      zip.file(name, f.data);
    });
    return await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
  }

  return {
    safeFileName: safeFileName,
    parseRanges: parseRanges,
    mergePdfs: mergePdfs,
    splitPdf: splitPdf,
    pdfInfo: pdfInfo,
    mergeExcel: mergeExcel,
    splitExcel: splitExcel,
    compareExcel: compareExcel,
    excelHeaders: excelHeaders,
    zipFiles: zipFiles,
  };
});
