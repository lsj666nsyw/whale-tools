/* app.js —— 鲸鱼工具箱前端逻辑（图片用 Canvas；PDF/表格调用 core.js） */
(function () {
  "use strict";

  var TB = createToolbox({ PDFLib: window.PDFLib, XLSX: window.XLSX, JSZip: window.JSZip });

  // ===================== 通用 =====================
  function $(id) { return document.getElementById(id); }
  function fmtSize(n) {
    var u = ["B", "KB", "MB", "GB"];
    for (var i = 0; i < u.length && n >= 1024; i++) n /= 1024;
    return (i === 0 ? n : n.toFixed(1)) + " " + u[i];
  }
  function log(box, msg, cls) {
    var d = document.createElement("div");
    if (cls) d.className = cls;
    d.textContent = msg;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }
  function clear(box) { box.innerHTML = ""; }
  function prog(box, ratio) {
    box.style.display = ratio == null ? "none" : "block";
    if (ratio != null) box.firstElementChild.style.width = Math.round(ratio * 100) + "%";
  }
  function download(name, data, type) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: type || "application/octet-stream" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function resultRow(box, name, size, data, type) {
    var row = document.createElement("div");
    row.className = "row";
    var nm = document.createElement("span"); nm.className = "nm"; nm.textContent = name;
    var sz = document.createElement("span"); sz.className = "sz"; sz.textContent = fmtSize(size);
    var a = document.createElement("a"); a.textContent = "下载";
    a.onclick = function () { download(name, data, type); };
    row.appendChild(nm); row.appendChild(sz); row.appendChild(a);
    box.appendChild(row);
  }
  function readAsArrayBuffer(f) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(new Error("读取失败")); };
      r.readAsArrayBuffer(f);
    });
  }

  // ===================== 文件选择组件 =====================
  function makePicker(dropId, inputId, listId, acceptRe) {
    var drop = $(dropId), input = $(inputId), list = $(listId);
    var files = [];
    function render() {
      clear(list);
      files.forEach(function (f, i) {
        var d = document.createElement("div");
        d.className = "fitem";
        var ord = document.createElement("span"); ord.className = "ord"; ord.textContent = i + 1;
        var nm = document.createElement("span"); nm.className = "nm"; nm.textContent = f.name;
        var sz = document.createElement("span"); sz.className = "sz"; sz.textContent = fmtSize(f.size);
        var up = document.createElement("span"); up.className = "mv"; up.textContent = i ? "↑" : "";
        var del = document.createElement("button"); del.textContent = "×";
        up.onclick = function (e) {
          e.stopPropagation();
          if (i > 0) { var t = files[i - 1]; files[i - 1] = files[i]; files[i] = t; render(); }
        };
        del.onclick = function (e) { e.stopPropagation(); files.splice(i, 1); render(); };
        d.appendChild(ord); d.appendChild(nm); d.appendChild(sz);
        if (i) d.appendChild(up);
        d.appendChild(del);
        list.appendChild(d);
      });
    }
    function add(fl) {
      Array.prototype.forEach.call(fl, function (f) {
        if (!acceptRe.test(f.name) && !acceptRe.test(f.type)) return;
        if (files.some(function (x) { return x.name === f.name && x.size === f.size; })) return;
        files.push(f);
      });
      render();
    }
    drop.onclick = function () { input.click(); };
    input.onchange = function () { add(input.files); input.value = ""; };
    ["dragover", "dragenter"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); });
    });
    drop.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files) add(e.dataTransfer.files); });
    return {
      get files() { return files; },
      clear: function () { files = []; render(); },
    };
  }

  // ===================== 分段按钮 =====================
  function seg(id, onChange) {
    var box = $(id), cur = box.querySelector(".on").dataset.v;
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      box.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      cur = b.dataset.v;
      onChange(cur);
    });
    return { get value() { return cur; } };
  }

  // ======================================================================
  // 图片工具（Canvas，纯前端）
  // ======================================================================
  var imgPick = makePicker("img-drop", "img-files", "img-list", /image\/|\.jpe?g$|\.png$|\.webp$|\.bmp$|\.tiff?$/i);
  var imgMode = { v: "none" };
  var imgSeg = seg("img-rmode", function (v) {
    imgMode.v = v;
    var box = $("img-rargs");
    clear(box);
    function inp(id, val, w) {
      var i = document.createElement("input");
      i.type = "number"; i.id = id; i.value = val; i.style.width = w || "70px";
      return i;
    }
    function lab(t) { var s = document.createElement("span"); s.style.fontSize = "12.5px"; s.style.color = "var(--ink3)"; s.textContent = t; return s; }
    if (v === "long") { box.appendChild(inp("img-long", 1600)); box.appendChild(lab("px 长边（只缩不放）")); }
    if (v === "fix") {
      box.appendChild(inp("img-w", 800, "62px")); box.appendChild(lab("×")); box.appendChild(inp("img-h", 800, "62px"));
      box.appendChild(lab("等比+补边"));
    }
    if (v === "pct") { box.appendChild(inp("img-pct", 50, "60px")); box.appendChild(lab("%")); }
  });
  $("img-q").oninput = function () { $("img-qv").textContent = this.value; };

  // Logo 水印：选文件并预加载
  var logoImg = null;
  $("img-logobtn").onclick = function () { $("img-logofile").click(); };
  $("img-logofile").onchange = function () {
    var f = this.files[0];
    if (!f) return;
    var url = URL.createObjectURL(f);
    var im = new Image();
    im.onload = function () {
      logoImg = im;
      $("img-logolabel").textContent = f.name + "（" + im.naturalWidth + "×" + im.naturalHeight + "）";
      $("img-logolabel").style.color = "#2fa360";
      $("img-logo").checked = true;
    };
    im.onerror = function () {
      $("img-logolabel").textContent = "这张图打不开";
      $("img-logolabel").style.color = "#c04040";
    };
    im.src = url;
  };

  function loadImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () { res({ img: im, url: url }); };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error("图片打不开")); };
      im.src = url;
    });
  }

  function drawOnCanvas(img, opts) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var w = iw, h = ih;
    if (opts.mode === "long" && opts.long > 0) {
      var s = opts.long / Math.max(iw, ih);
      if (s < 1) { w = Math.round(iw * s); h = Math.round(ih * s); }
    } else if (opts.mode === "pct" && opts.pct > 0) {
      w = Math.max(1, Math.round(iw * opts.pct / 100));
      h = Math.max(1, Math.round(ih * opts.pct / 100));
    }
    var bg = opts.bg || "#ffffff";

    function make(w2, h2) {
      var c = document.createElement("canvas");
      c.width = w2; c.height = h2;
      var x = c.getContext("2d");
      x.fillStyle = bg; x.fillRect(0, 0, w2, h2);
      x.imageSmoothingQuality = "high";
      return { c: c, x: x };
    }
    var out;
    if (opts.mode === "fix" && opts.fw > 0 && opts.fh > 0) {
      out = make(opts.fw, opts.fh);
      var sc = Math.min(opts.fw / w, opts.fh / h);
      var nw = Math.round(w * sc), nh = Math.round(h * sc);
      out.x.drawImage(img, (opts.fw - nw) / 2, (opts.fh - nh) / 2, nw, nh);
    } else {
      out = make(w, h);
      out.x.drawImage(img, 0, 0, w, h);
    }
    if (opts.square) {
      var side = Math.max(out.c.width, out.c.height);
      var sq = make(side, side);
      sq.x.drawImage(out.c, (side - out.c.width) / 2, (side - out.c.height) / 2);
      out = sq;
    }
    if (opts.watermark && opts.wmText) {
      var c2 = out.c, x2 = out.x;
      var fs = Math.max(10, Math.round(Math.min(c2.width, c2.height) * 0.055));
      x2.font = fs + 'px "Microsoft YaHei", PingFang SC, sans-serif';
      x2.textBaseline = "middle";
      x2.globalAlpha = 0.45;
      var tw = x2.measureText(opts.wmText).width;
      var m = Math.round(Math.min(c2.width, c2.height) * 0.04);
      var cx, cy, rot = 0;
      if (opts.wmPos === "center") { cx = c2.width / 2; cy = c2.height / 2; rot = -Math.PI / 6; }
      else {
        cx = opts.wmPos[1] === "w" ? m + tw / 2 : opts.wmPos[1] === "e" ? c2.width - m - tw / 2 : c2.width / 2;
        cy = opts.wmPos[0] === "n" ? m + fs / 2 : opts.wmPos[0] === "s" ? c2.height - m - fs / 2 : c2.height / 2;
      }
      x2.save();
      x2.translate(cx, cy);
      x2.rotate(rot);
      x2.fillStyle = "#ffffff";
      x2.strokeStyle = "rgba(0,0,0,.35)";
      x2.lineWidth = Math.max(2, fs * 0.07);
      x2.strokeText(opts.wmText, -tw / 2, 0);
      x2.fillText(opts.wmText, -tw / 2, 0);
      x2.restore();
      x2.globalAlpha = 1;
    }
    return out.c;
  }

  // ===================== 图片高级处理（对齐桌面专业版） =====================
  /**
   * 智能去白边：扫描四边，找出"几乎全为背景色"的行列并裁掉。
   * 与桌面版同一套思路：逐行逐列统计背景像素占比，98% 以上算背景行。
   */
  function trimEdges(canvas, tolerance) {
    var w = canvas.width, h = canvas.height;
    if (w < 8 || h < 8) return canvas;
    var ctx = canvas.getContext("2d");
    var data = ctx.getImageData(0, 0, w, h).data;
    var tol = Math.max(1, Math.round(tolerance * 2.55));

    // 用四角平均色当背景色
    function px(x, y) {
      var i = (y * w + x) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    }
    var corners = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
    var bg = [0, 1, 2].map(function (k) {
      return Math.round(corners.reduce(function (s, c) { return s + c[k]; }, 0) / 4);
    });

    function isBg(x, y) {
      var i = (y * w + x) * 4;
      return Math.abs(data[i] - bg[0]) <= tol &&
        Math.abs(data[i + 1] - bg[1]) <= tol &&
        Math.abs(data[i + 2] - bg[2]) <= tol;
    }
    var RATIO = 0.98;
    function rowBg(y) {
      var n = 0;
      for (var x = 0; x < w; x++) if (isBg(x, y)) n++;
      return n >= w * RATIO;
    }
    function colBg(x) {
      var n = 0;
      for (var y = 0; y < h; y++) if (isBg(x, y)) n++;
      return n >= h * RATIO;
    }
    var top = 0;
    while (top < h && rowBg(top)) top++;
    var bottom = h;
    while (bottom > top && rowBg(bottom - 1)) bottom--;
    var left = 0;
    while (left < w && colBg(left)) left++;
    var right = w;
    while (right > left && colBg(right - 1)) right--;

    if (top === 0 && bottom === h && left === 0 && right === w) return canvas;
    var nw = right - left, nh = bottom - top;
    if (nw < 8 || nh < 8 || nw < w * 0.2 || nh < h * 0.2) return canvas;

    var out = document.createElement("canvas");
    out.width = nw; out.height = nh;
    out.getContext("2d").drawImage(canvas, left, top, nw, nh, 0, 0, nw, nh);
    return out;
  }

  /** 抠图：把接近背景色的像素变透明（输出必须 PNG/WEBP） */
  function removeBg(canvas, tolerance) {
    var w = canvas.width, h = canvas.height;
    var ctx = canvas.getContext("2d");
    var imgData = ctx.getImageData(0, 0, w, h);
    var d = imgData.data;
    var tol = Math.max(1, Math.round(tolerance * 2.55));
    function px(x, y) {
      var i = (y * w + x) * 4;
      return [d[i], d[i + 1], d[i + 2]];
    }
    var corners = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
    var bg = [0, 1, 2].map(function (k) {
      return Math.round(corners.reduce(function (s, c) { return s + c[k]; }, 0) / 4);
    });
    for (var i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - bg[0]) <= tol &&
        Math.abs(d[i + 1] - bg[1]) <= tol &&
        Math.abs(d[i + 2] - bg[2]) <= tol) {
        d[i + 3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  /** 加纯色边框：widthPermille 相对短边千分比 */
  function addBorder(canvas, widthPermille, color) {
    var w = canvas.width, h = canvas.height;
    var px = Math.max(1, Math.round(Math.min(w, h) * widthPermille / 1000));
    if (px * 2 >= Math.min(w, h)) return canvas;
    var out = document.createElement("canvas");
    out.width = w + px * 2; out.height = h + px * 2;
    var x = out.getContext("2d");
    x.fillStyle = color;
    x.fillRect(0, 0, out.width, out.height);
    x.drawImage(canvas, px, px);
    return out;
  }

  /** 贴 logo 水印：logoImg 已加载，scalePct 为占图片宽度百分比 */
  function drawLogo(canvas, logoImg, pos, scalePct, opacity) {
    var w = canvas.width, h = canvas.height;
    var lw = Math.max(8, Math.round(w * scalePct / 100));
    var lh = Math.round(logoImg.naturalHeight * (lw / logoImg.naturalWidth));
    var m = Math.round(Math.min(w, h) * 0.03);
    var x0 = pos[1] === "w" ? m : pos[1] === "e" ? w - lw - m : Math.round((w - lw) / 2);
    var y0 = pos[0] === "n" ? m : pos[0] === "s" ? h - lh - m : Math.round((h - lh) / 2);
    var ctx = canvas.getContext("2d");
    ctx.save();
    ctx.globalAlpha = Math.max(0.05, Math.min(1, opacity / 100));
    ctx.drawImage(logoImg, x0, y0, lw, lh);
    ctx.restore();
    return canvas;
  }

  function canvasToBlob(c, type, q) {
    return new Promise(function (res, rej) {
      c.toBlob(function (b) { b ? res(b) : rej(new Error("导出失败")); }, type, q);
    });
  }

  async function compressToSize(c, type, startQ, targetBytes) {
    var lo = 5, hi = Math.round(startQ * 100), best = null;
    for (var i = 0; i < 8; i++) {
      var mid = Math.round((lo + hi) / 2);
      var b = await canvasToBlob(c, type, mid / 100);
      if (b.size <= targetBytes) { best = b; lo = mid + 1; if (b.size >= targetBytes * 0.85) break; }
      else hi = mid - 1;
      if (lo > hi) break;
    }
    if (!best) best = await canvasToBlob(c, type, 0.05);
    return best;
  }

  $("img-run").onclick = async function () {
    var files = imgPick.files;
    var box = $("img-log"), res = $("img-res"), pv = $("img-pv");
    clear(box); clear(res); clear(pv);
    if (!files.length) { log(box, "请先选择图片", "err"); return; }
    var opts = {
      mode: imgMode.v,
      long: +(($("img-long") || {}).value || 1600),
      fw: +(($("img-w") || {}).value || 800),
      fh: +(($("img-h") || {}).value || 800),
      pct: +(($("img-pct") || {}).value || 50),
      square: $("img-sq").checked,
      trim: $("img-trim").checked,
      cut: $("img-cut").checked,
      watermark: $("img-wm").checked,
      wmText: $("img-wmt").value,
      wmPos: $("img-wmp").value,
      logo: $("img-logo").checked,
      logoPos: $("img-logopos").value,
      border: $("img-bd").checked,
      borderW: +$("img-bdw").value || 4,
      borderC: $("img-bdc").value,
      fmt: $("img-fmt").value,
      q: +$("img-q").value,
      limit: $("img-lim").checked ? (+$("img-kb").value || 200) * 1024 : 0,
    };
    if (opts.watermark && !opts.wmText.trim()) { log(box, "勾了水印但没填文字", "err"); return; }
    if (opts.logo && !logoImg) { log(box, "勾了 Logo 水印但没选 Logo 文件", "err"); return; }
    if (opts.cut && opts.fmt === "image/jpeg") {
      log(box, "抠图需要透明背景，输出格式不能是 JPG（请改成 PNG 或 WebP）", "err");
      return;
    }
    this.disabled = true;
    prog($("img-prog"), 0);
    var outs = [], totalIn = 0, totalOut = 0;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      try {
        var r = await loadImage(f);
        var c = drawOnCanvas(r.img, opts);
        URL.revokeObjectURL(r.url);
        // 专业版流程：去白边 → 抠图 → 边框 → logo 水印
        if (opts.trim) c = trimEdges(c, 12);
        if (opts.cut) c = removeBg(c, 30);
        if (opts.border) c = addBorder(c, opts.borderW, opts.borderC);
        if (opts.logo && logoImg) c = drawLogo(c, logoImg, opts.logoPos, 18, 60);
        var type = opts.fmt === "keep" ? (f.type === "image/png" ? "image/png" : "image/jpeg") : opts.fmt;
        if (opts.cut && type === "image/jpeg") type = "image/png";
        var blob;
        if (opts.limit && type !== "image/png") blob = await compressToSize(c, type, opts.q / 100, opts.limit);
        else blob = await canvasToBlob(c, type, opts.q / 100);
        totalIn += f.size; totalOut += blob.size;
        var ext = type === "image/png" ? ".png" : type === "image/webp" ? ".webp" : ".jpg";
        var nm = f.name.replace(/\.[^.]+$/, "") + ext;
        outs.push({ name: nm, data: blob, size: blob.size });
        // 预览
        var fig = document.createElement("figure");
        var im = document.createElement("img");
        im.src = URL.createObjectURL(blob);
        var cap = document.createElement("figcaption");
        cap.textContent = fmtSize(blob.size);
        fig.appendChild(im); fig.appendChild(cap);
        pv.appendChild(fig);
        log(box, "✓ " + f.name + "  " + fmtSize(f.size) + " → " + fmtSize(blob.size), "ok");
      } catch (e) {
        log(box, "✗ " + f.name + "：" + (e.message || e), "err");
      }
      prog($("img-prog"), (i + 1) / files.length);
      if (i % 3 === 2) await new Promise(function (r2) { setTimeout(r2, 0); });
    }
    if (outs.length) {
      if (outs.length === 1) {
        resultRow(res, outs[0].name, outs[0].size, outs[0].data, outs[0].data.type);
      } else {
        var zip = await TB.zipFiles(outs.map(function (o) { return { name: o.name, data: o.data }; }));
        var a = document.createElement("a");
        a.className = "bigdl";
        a.textContent = "打包下载全部 " + outs.length + " 张（" + fmtSize(zip.byteLength) + "）";
        a.onclick = function () { download("图片结果.zip", zip, "application/zip"); };
        res.appendChild(a);
      }
      var saved = totalIn - totalOut;
      log(box, "", null);
      log(box, "完成 " + outs.length + " 张" + (saved > 0 ? "，共省 " + fmtSize(saved) : ""), "ok");
    }
    this.disabled = false;
    prog($("img-prog"), null);
  };

  // ======================================================================
  // PDF 工具
  // ======================================================================
  var pdfPick = makePicker("pdf-drop", "pdf-files", "pdf-list", /\.pdf$/i);
  var pdfMode = seg("pdf-mode", renderPdfArgs);
  function renderPdfArgs(v) {
    var box = $("pdf-args");
    clear(box);
    if (v === "chunk") {
      var l = document.createElement("label"); l.textContent = "每";
      var i = document.createElement("input"); i.type = "number"; i.id = "pdf-n"; i.value = 10; i.style.width = "64px";
      var l2 = document.createElement("label"); l2.textContent = "页一个文件";
      box.appendChild(l); box.appendChild(i); box.appendChild(l2);
    } else if (v === "range") {
      var l3 = document.createElement("label"); l3.textContent = "页码";
      var i2 = document.createElement("input"); i2.type = "text"; i2.id = "pdf-r"; i2.placeholder = "1-3,5,8-10"; i2.style.flex = "1"; i2.style.minWidth = "140px";
      box.appendChild(l3); box.appendChild(i2);
    } else {
      var s = document.createElement("span");
      s.style.fontSize = "12.5px"; s.style.color = "var(--ink3)";
      s.textContent = v === "merge" ? "按上方列表顺序合并，可点 ↑ 调整顺序" : "把第一个 PDF 的每一页各存为一个文件";
      box.appendChild(s);
    }
  }
  renderPdfArgs("merge");
  $("pdf-files").addEventListener("change", updatePdfInfo);
  async function updatePdfInfo() {
    var info = $("pdf-info");
    var f = pdfPick.files[0];
    if (!f) { info.textContent = ""; return; }
    try {
      var d = await readAsArrayBuffer(f);
      var r = await TB.pdfInfo(d);
      info.textContent = "第一个文件：" + f.name + "，共 " + r.pages + " 页";
    } catch (e) {
      info.textContent = "第一个文件读不了：" + (e.message || e);
    }
  }

  $("pdf-run").onclick = async function () {
    var box = $("pdf-log"), res = $("pdf-res");
    clear(box); clear(res);
    var files = pdfPick.files;
    if (!files.length) { log(box, "请先选择 PDF", "err"); return; }
    var mode = pdfMode.value;
    if (mode === "merge" && files.length < 2) { log(box, "合并至少需要 2 个 PDF", "err"); return; }
    this.disabled = true;
    prog($("pdf-prog"), 0);
    try {
      if (mode === "merge") {
        var items = [];
        for (var i = 0; i < files.length; i++) {
          items.push({ name: files[i].name, data: await readAsArrayBuffer(files[i]) });
          prog($("pdf-prog"), (i + 1) / (files.length + 1));
        }
        var r = await TB.mergePdfs(items);
        r.skipped.forEach(function (s) { log(box, "✗ " + s.name + "：" + s.reason, "err"); });
        r.outline.forEach(function (o) { log(box, "  " + o.title + "  " + o.count + " 页", null); });
        log(box, "", null);
        log(box, "合并完成：共 " + r.outline.reduce(function (a, b) { return a + b.count; }, 0) + " 页", "ok");
        resultRow(res, "合并结果.pdf", r.data.byteLength, r.data, "application/pdf");
      } else {
        var f = files[0];
        var data = await readAsArrayBuffer(f);
        var rr = await TB.splitPdf({ name: f.name, data: data }, mode, {
          pagesPerFile: +(($("pdf-n") || {}).value || 10),
          ranges: ($("pdf-r") || {}).value || "",
        });
        prog($("pdf-prog"), 0.8);
        rr.results.forEach(function (x) { log(box, "  " + x.name + "  " + x.data.byteLength, null); });
        log(box, "", null);
        log(box, "拆分完成：" + rr.results.length + " 个文件", "ok");
        if (rr.results.length === 1) {
          resultRow(res, rr.results[0].name, rr.results[0].data.byteLength, rr.results[0].data, "application/pdf");
        } else {
          var zip = await TB.zipFiles(rr.results.map(function (x) { return { name: x.name, data: x.data }; }));
          var a = document.createElement("a");
          a.className = "bigdl";
          a.textContent = "打包下载 " + rr.results.length + " 个 PDF（" + fmtSize(zip.byteLength) + "）";
          a.onclick = function () { download("PDF拆分结果.zip", zip, "application/zip"); };
          res.appendChild(a);
        }
      }
    } catch (e) {
      log(box, "✗ " + (e.message || e), "err");
    }
    this.disabled = false;
    prog($("pdf-prog"), null);
  };

  // ======================================================================
  // 表格工具
  // ======================================================================
  var xlPick = makePicker("xl-drop", "xl-files", "xl-list", /\.(xlsx|xls|csv)$/i);
  var xlMode = seg("xl-mode", function (v) { renderXlArgs(v); });
  var xlHeaders = [];
  async function loadXlHeaders() {
    var f = xlPick.files[0];
    var info = $("xl-info");
    if (!f) { xlHeaders = []; info.textContent = ""; return; }
    try {
      var d = await readAsArrayBuffer(f);
      xlHeaders = await TB.excelHeaders({ name: f.name, data: d });
      info.textContent = f.name + " 的列：" + xlHeaders.slice(0, 12).join("、") + (xlHeaders.length > 12 ? "…" : "");
      if (xlMode.value === "split" || xlMode.value === "cmp") renderXlArgs(xlMode.value);
    } catch (e) { info.textContent = "读不了：" + (e.message || e); }
  }
  $("xl-files").addEventListener("change", loadXlHeaders);

  function renderXlArgs(v) {
    var box = $("xl-args");
    clear(box);
    if (v === "merge") {
      var s = document.createElement("span");
      s.style.fontSize = "12.5px"; s.style.color = "var(--ink3)";
      s.textContent = "按列名自动对齐（列顺序不同也没关系），可加「来源文件」列";
      box.appendChild(s);
    } else if (v === "split") {
      var l = document.createElement("label"); l.textContent = "按列";
      var sel = document.createElement("select"); sel.id = "xl-key";
      if (!xlHeaders.length) { var o = document.createElement("option"); o.textContent = "（先选文件）"; sel.appendChild(o); }
      xlHeaders.forEach(function (h) { var o = document.createElement("option"); o.value = h; o.textContent = h; sel.appendChild(o); });
      var l2 = document.createElement("label"); l2.textContent = "的值拆分";
      box.appendChild(l); box.appendChild(sel); box.appendChild(l2);
    } else {
      var l3 = document.createElement("label"); l3.textContent = "关键列（比对依据）";
      var sel2 = document.createElement("select"); sel2.id = "xl-cmpkey"; sel2.multiple = false; sel2.size = 1;
      sel2.style.minWidth = "150px";
      if (!xlHeaders.length) { var o2 = document.createElement("option"); o2.textContent = "（先选文件）"; sel2.appendChild(o2); }
      xlHeaders.forEach(function (h) { var o = document.createElement("option"); o.value = h; o.textContent = h; sel2.appendChild(o); });
      var tip = document.createElement("span");
      tip.style.fontSize = "12px"; tip.style.color = "var(--ink3)";
      tip.textContent = "（比对需要恰好 2 个文件）";
      box.appendChild(l3); box.appendChild(sel2); box.appendChild(tip);
    }
  }
  renderXlArgs("merge");

  $("xl-run").onclick = async function () {
    var box = $("xl-log"), res = $("xl-res");
    clear(box); clear(res);
    var files = xlPick.files, v = xlMode.value;
    if (!files.length) { log(box, "请先选择表格", "err"); return; }
    if (v === "merge" && files.length < 2) { log(box, "合并至少需要 2 个表格", "err"); return; }
    if (v === "cmp" && files.length !== 2) { log(box, "比对需要恰好 2 个表格", "err"); return; }
    this.disabled = true;
    prog($("xl-prog"), 0);
    try {
      var items = [];
      for (var i = 0; i < files.length; i++) {
        items.push({ name: files[i].name, data: await readAsArrayBuffer(files[i]) });
        prog($("xl-prog"), (i + 1) / (files.length + 1));
      }
      if (v === "merge") {
        var r = await TB.mergeExcel(items);
        r.perFile.forEach(function (p) { log(box, "  " + p.name + "  " + p.rows + " 行" + (p.note ? "（" + p.note + "）" : ""), null); });
        log(box, "", null);
        log(box, "合并完成：共 " + r.rows + " 行", "ok");
        resultRow(res, "合并结果.xlsx", r.data.byteLength, r.data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      } else if (v === "split") {
        var key = ($("xl-key") || {}).value;
        if (!key) { log(box, "请选择拆分列", "err"); this.disabled = false; return; }
        var rr = await TB.splitExcel(items[0], key);
        log(box, "  共 " + rr.groups + " 组", null);
        log(box, "", null);
        log(box, "拆分完成", "ok");
        var zip = await TB.zipFiles(rr.results.map(function (x) { return { name: x.name, data: x.data }; }));
        var a = document.createElement("a");
        a.className = "bigdl";
        a.textContent = "打包下载 " + rr.results.length + " 个表格（" + fmtSize(zip.byteLength) + "）";
        a.onclick = function () { download("拆分结果.zip", zip, "application/zip"); };
        res.appendChild(a);
      } else {
        var ck = ($("xl-cmpkey") || {}).value;
        if (!ck) { log(box, "请选择关键列", "err"); this.disabled = false; return; }
        var rc = await TB.compareExcel(items[0], items[1], [ck]);
        log(box, "  仅在A：" + rc.onlyA + " 行｜仅在B：" + rc.onlyB + " 行｜值不同：" + rc.diffs + " 处", null);
        log(box, "", null);
        log(box, "比对完成", "ok");
        resultRow(res, "比对结果.xlsx", rc.data.byteLength, rc.data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      }
    } catch (e) {
      log(box, "✗ " + (e.message || e), "err");
    }
    this.disabled = false;
    prog($("xl-prog"), null);
  };

  // ===================== 选项卡切换 =====================
  document.querySelector("nav").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    document.querySelectorAll("nav button").forEach(function (x) { x.classList.remove("on"); });
    document.querySelectorAll("section").forEach(function (x) { x.classList.remove("on"); });
    b.classList.add("on");
    $("s-" + b.dataset.t).classList.add("on");
  });

  // ===================== 依赖自检 =====================
  ["PDFLib", "XLSX", "JSZip"].forEach(function (n) {
    if (!window[n]) {
      var d = document.createElement("div");
      d.style.cssText = "background:#fff0f0;color:#c04040;padding:10px 14px;font-size:13px;border-radius:10px;margin:10px 0";
      d.textContent = "组件 " + n + " 加载失败，请检查网络后刷新页面。";
      document.querySelector("main").prepend(d);
    }
  });
})();
