/* tools.js —— 第二站：实用小工具集（全部本地运行，免费无限制） */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function fmt(n) {
    var u = ["B", "KB", "MB", "GB"], i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i === 0 ? n : n.toFixed(1)) + " " + u[i];
  }
  function log(box, msg, cls) {
    var d = document.createElement("div");
    if (cls) d.className = cls;
    d.textContent = msg;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }
  function download(name, data, type) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: type || "application/octet-stream" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function readBuf(f) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(new Error("读取失败")); };
      r.readAsArrayBuffer(f);
    });
  }
  function readText(f) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(new Error("读取失败")); };
      r.readAsText(f, "utf-8");
    });
  }

  // ===================== 选项卡 =====================
  document.querySelector("nav").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    document.querySelectorAll("nav button").forEach(function (x) { x.classList.remove("on"); });
    document.querySelectorAll("section").forEach(function (x) { x.classList.remove("on"); });
    b.classList.add("on");
    $("t-" + b.dataset.t).classList.add("on");
  });

  // ===================== 1. 二维码生成 =====================
  var qr = null;
  function renderQR() {
    var text = $("qr-text").value;
    var box = $("qr-box");
    var size = +$("qr-size").value || 300;
    var ec = $("qr-ec").value;
    if (!text.trim()) { box.innerHTML = '<span style="color:#8b95a8;font-size:13px">输入内容后这里显示二维码</span>'; qr = null; return; }
    try {
      var q = qrcode(0, ec);
      q.addData(text);
      q.make();
      qr = q;
      box.innerHTML = q.createImgTag(6, 8);
      var img = box.querySelector("img");
      img.style.width = size + "px";
      img.style.height = size + "px";
    } catch (e) {
      box.innerHTML = '<span style="color:#c04040;font-size:13px">内容太长，请缩短</span>';
      qr = null;
    }
  }
  $("qr-text").addEventListener("input", renderQR);
  $("qr-size").addEventListener("input", renderQR);
  $("qr-ec").addEventListener("change", renderQR);
  $("qr-dl").onclick = function () {
    if (!qr) { alert("请先输入内容"); return; }
    var size = +$("qr-size").value || 300;
    var svg = qr.createSvgTag({ cellSize: 8, margin: 8, scalable: true });
    var blob = new Blob([svg], { type: "image/svg+xml" });
    download("二维码.svg", blob, "image/svg+xml");
  };
  renderQR();

  // ===================== 2. 颜色工具 =====================
  function hexToRgb(h) {
    h = h.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(function (v) {
      return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    }).join("");
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) {
      var d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (mx === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }
  function updateColor() {
    var hex = $("c-pick").value;
    var rgb = hexToRgb(hex);
    var hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    $("c-hex").value = hex.toUpperCase();
    $("c-rgb").value = "rgb(" + rgb.join(", ") + ")";
    $("c-hsl").value = "hsl(" + hsl[0] + ", " + hsl[1] + "%, " + hsl[2] + "%)";
    // 明暗变体
    var shades = [];
    for (var i = 1; i <= 5; i++) {
      var f = i / 6;
      shades.push(rgbToHex(rgb[0] + (255 - rgb[0]) * f, rgb[1] + (255 - rgb[1]) * f, rgb[2] + (255 - rgb[2]) * f));
    }
    var darks = [];
    for (var j = 1; j <= 5; j++) {
      var k = 1 - j / 6;
      darks.push(rgbToHex(rgb[0] * k, rgb[1] * k, rgb[2] * k));
    }
    $("c-shades").innerHTML = shades.concat(darks.reverse()).map(function (c) {
      return '<i style="background:' + c + '" title="' + c + '" data-c="' + c + '"></i>';
    }).join("");
  }
  $("c-pick").addEventListener("input", updateColor);
  $("c-shades").addEventListener("click", function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.c) { $("c-pick").value = t.dataset.c; updateColor(); }
  });
  document.querySelectorAll(".cp-copy").forEach(function (btn) {
    btn.onclick = function () {
      var inp = $(btn.dataset.for);
      inp.select();
      document.execCommand("copy");
      btn.textContent = "已复制";
      setTimeout(function () { btn.textContent = "复制"; }, 1200);
    };
  });
  updateColor();

  // ===================== 3. 文本处理 =====================
  $("txt-go").onclick = function () {
    var s = $("txt-in").value;
    var out = s;
    if ($("txt-trim").checked) out = out.split("\n").map(function (l) { return l.trim(); }).join("\n");
    if ($("txt-nospace").checked) out = out.replace(/[ \t]+/g, " ");
    if ($("txt-dedup").checked) {
      var seen = {}, lines = out.split("\n").filter(function (l) {
        if (l.trim() === "") return false;
        if (seen[l]) return false;
        seen[l] = 1; return true;
      });
      out = lines.join("\n");
    }
    if ($("txt-empty").checked) out = out.split("\n").filter(function (l) { return l.trim() !== ""; }).join("\n");
    if ($("txt-case").value === "upper") out = out.toUpperCase();
    else if ($("txt-case").value === "lower") out = out.toLowerCase();
    $("txt-out").value = out;
    $("txt-stat").textContent = "原 " + s.length + " 字符 → 处理后 " + out.length + " 字符";
  };
  $("txt-copy").onclick = function () {
    $("txt-out").select();
    document.execCommand("copy");
    this.textContent = "已复制！";
    var self = this;
    setTimeout(function () { self.textContent = "复制结果"; }, 1200);
  };
  $("txt-clear").onclick = function () {
    $("txt-in").value = ""; $("txt-out").value = ""; $("txt-stat").textContent = "";
  };

  // ===================== 4. 单位换算 =====================
  var UNITS = {
    length: { name: "长度", units: { "米": 1, "千米": 1000, "厘米": 0.01, "毫米": 0.001, "英寸": 0.0254, "英尺": 0.3048, "码": 0.9144, "英里": 1609.344 } },
    weight: { name: "重量", units: { "千克": 1, "克": 0.001, "吨": 1000, "磅": 0.45359237, "盎司": 0.028349523 } },
    area: { name: "面积", units: { "平方米": 1, "平方厘米": 0.0001, "平方千米": 1e6, "公顷": 10000, "亩": 666.6667, "平方英尺": 0.09290304 } },
    data: { name: "数据", units: { "B": 1, "KB": 1024, "MB": 1048576, "GB": 1073741824, "TB": 1099511627776 } },
    time: { name: "时间", units: { "秒": 1, "分钟": 60, "小时": 3600, "天": 86400, "周": 604800 } },
  };
  function buildUnitSel() {
    var cat = $("u-cat").value;
    var u = UNITS[cat].units;
    var from = $("u-from"), to = $("u-to");
    from.innerHTML = ""; to.innerHTML = "";
    Object.keys(u).forEach(function (k) {
      from.appendChild(new Option(k, k));
      to.appendChild(new Option(k, k));
    });
    to.selectedIndex = Math.min(1, to.options.length - 1);
    convertUnit();
  }
  function convertUnit() {
    var cat = $("u-cat").value;
    var u = UNITS[cat].units;
    var v = parseFloat($("u-val").value) || 0;
    var f = u[$("u-from").value], t = u[$("u-to").value];
    if (f == null || t == null) return;
    var r = v * f / t;
    $("u-out").value = (Math.abs(r) >= 1e-6 && Math.abs(r) < 1e9) ? +r.toPrecision(10) : r;
  }
  $("u-cat").onchange = buildUnitSel;
  $("u-val").oninput = convertUnit;
  $("u-from").onchange = convertUnit;
  $("u-to").onchange = convertUnit;
  buildUnitSel();

  // ===================== 5. 密码生成 =====================
  function genPwd() {
    var len = +$("p-len").value || 16;
    var sets = [];
    if ($("p-lower").checked) sets.push("abcdefghijkmnpqrstuvwxyz");
    if ($("p-upper").checked) sets.push("ABCDEFGHJKLMNPQRSTUVWXYZ");
    if ($("p-digit").checked) sets.push("23456789");
    if ($("p-sym").checked) sets.push("!@#$%^&*-_=+?");
    if (!sets.length) { $("p-out").value = "请至少勾选一种字符"; return; }
    var all = sets.join("");
    var arr = new Uint32Array(len);
    (window.crypto || window.msCrypto).getRandomValues(arr);
    var out = "";
    for (var i = 0; i < len; i++) out += all[arr[i] % all.length];
    // 确保每类至少一个
    sets.forEach(function (s, idx) {
      if (out.indexOf(s[0]) < 0 && idx < len) {
        var pos = (arr[idx] % len);
        out = out.slice(0, pos) + s[arr[idx] % s.length] + out.slice(pos + 1);
      }
    });
    $("p-out").value = out;
    // 强度
    var strength = Math.min(100, Math.round(len / 24 * 60 + sets.length / 4 * 40));
    $("p-bar").style.width = strength + "%";
    $("p-bar").style.background = strength > 75 ? "#2fa360" : strength > 45 ? "#e2a33a" : "#d9534f";
    $("p-tip").textContent = strength > 75 ? "很强" : strength > 45 ? "中等" : "偏弱";
  }
  $("p-go").onclick = genPwd;
  $("p-len").oninput = function () { $("p-len-v").textContent = this.value; };
  $("p-copy").onclick = function () {
    $("p-out").select(); document.execCommand("copy");
    this.textContent = "已复制"; var s = this;
    setTimeout(function () { s.textContent = "复制"; }, 1200);
  };
  genPwd();

  // ===================== 6. 时间戳转换 =====================
  function pad(n) { return String(n).padStart(2, "0"); }
  function fmtDate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }
  function tsConvert() {
    var v = $("ts-in").value.trim();
    var d;
    if (/^\d{10}$/.test(v)) d = new Date(+v * 1000);
    else if (/^\d{13}$/.test(v)) d = new Date(+v);
    else if (v) d = new Date(v.replace(/-/g, "/"));
    else d = new Date();
    if (isNaN(d.getTime())) { $("ts-out").innerHTML = '<span style="color:#c04040">格式看不懂，试试 1700000000 或 2024-01-01 12:00:00</span>'; return; }
    $("ts-out").innerHTML =
      row("本地时间", fmtDate(d)) +
      row("秒级时间戳", Math.floor(d.getTime() / 1000)) +
      row("毫秒时间戳", d.getTime()) +
      row("ISO 8601", d.toISOString()) +
      row("星期", "星期" + "日一二三四五六"[d.getDay()]) +
      row("距现在", agoText(d));
  }
  function row(k, v) {
    return '<div class="ts-row"><b>' + k + '</b><span class="ts-val" data-v="' + v + '">' + v + '</span></div>';
  }
  function agoText(d) {
    var diff = Date.now() - d.getTime();
    var abs = Math.abs(diff);
    var s = abs < 60000 ? Math.round(abs / 1000) + " 秒" :
      abs < 3600000 ? Math.round(abs / 60000) + " 分钟" :
        abs < 86400000 ? Math.round(abs / 3600000) + " 小时" :
          Math.round(abs / 86400000) + " 天";
    return diff >= 0 ? s + "前" : s + "后";
  }
  $("ts-go").onclick = tsConvert;
  $("ts-now").onclick = function () { $("ts-in").value = Math.floor(Date.now() / 1000); tsConvert(); };
  $("ts-out").addEventListener("click", function (e) {
    var t = e.target;
    if (t.classList.contains("ts-val")) {
      var ta = document.createElement("textarea");
      ta.value = t.dataset.v; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
      var old = t.textContent; t.textContent = "已复制"; 
      setTimeout(function () { t.textContent = old; }, 900);
    }
  });
  tsConvert();

  // ===================== 7. JSON 格式化 =====================
  $("j-go").onclick = function () {
    var s = $("j-in").value.trim();
    if (!s) { $("j-out").value = ""; return; }
    try {
      var o = JSON.parse(s);
      var ind = +$("j-indent").value;
      var out = $("j-min").checked ? JSON.stringify(o) : JSON.stringify(o, null, ind);
      $("j-out").value = out;
      $("j-stat").textContent = "✓ 有效 JSON｜" + (Array.isArray(o) ? "数组 " + o.length + " 项" : typeof o === "object" ? "对象 " + Object.keys(o).length + " 个键" : typeof o);
      $("j-stat").style.color = "#2fa360";
    } catch (e) {
      $("j-out").value = "";
      $("j-stat").textContent = "✗ " + e.message;
      $("j-stat").style.color = "#c04040";
    }
  };
  $("j-copy").onclick = function () {
    $("j-out").select(); document.execCommand("copy");
    this.textContent = "已复制"; var s = this;
    setTimeout(function () { s.textContent = "复制"; }, 1200);
  };

  // ===================== 8. 图片压缩（简版） =====================
  var imgFile = null;
  $("ic-drop").onclick = function () { $("ic-file").click(); };
  $("ic-file").onchange = function () {
    var f = this.files[0];
    if (!f) return;
    imgFile = f;
    $("ic-name").textContent = f.name + "  (" + fmt(f.size) + ")";
    $("ic-run").disabled = false;
    $("ic-res").innerHTML = "";
  };
  $("ic-run").onclick = async function () {
    if (!imgFile) return;
    var q = +$("ic-q").value / 100;
    var maxW = +$("ic-max").value || 0;
    var box = $("ic-res");
    box.innerHTML = '<span style="color:#8b95a8;font-size:13px">处理中…</span>';
    try {
      var url = URL.createObjectURL(imgFile);
      var im = await new Promise(function (res, rej) {
        var i = new Image();
        i.onload = function () { res(i); };
        i.onerror = function () { rej(new Error("图片打不开")); };
        i.src = url;
      });
      var w = im.naturalWidth, h = im.naturalHeight;
      if (maxW > 0 && Math.max(w, h) > maxW) {
        var s = maxW / Math.max(w, h);
        w = Math.round(w * s); h = Math.round(h * s);
      }
      var c = document.createElement("canvas");
      c.width = w; c.height = h;
      var ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(im, 0, 0, w, h);
      URL.revokeObjectURL(url);
      var blob = await new Promise(function (res) {
        c.toBlob(res, "image/jpeg", q);
      });
      var saved = imgFile.size - blob.size;
      var pct = imgFile.size > 0 ? (saved / imgFile.size * 100) : 0;
      box.innerHTML =
        '<div style="font-size:13px;color:#2fa360;margin-bottom:8px">✓ ' +
        fmt(imgFile.size) + " → " + fmt(blob.size) +
        (saved > 0 ? "（省 " + pct.toFixed(0) + "%）" : "（没变小，试试降低画质）") + "</div>" +
        '<img src="' + URL.createObjectURL(blob) + '" style="max-width:100%;border-radius:8px;border:1px solid #e3e8f0">';
      var btn = document.createElement("button");
      btn.className = "go";
      btn.style.marginTop = "10px";
      btn.textContent = "下载压缩后的图片";
      btn.onclick = function () {
        download(imgFile.name.replace(/\.[^.]+$/, "") + "_压缩.jpg", blob, "image/jpeg");
      };
      box.appendChild(btn);
    } catch (e) {
      box.innerHTML = '<span style="color:#c04040;font-size:13px">✗ ' + e.message + "</span>";
    }
  };

  // ===================== 9. 日期计算 =====================
  function dateDiff() {
    var a = new Date($("d-a").value.replace(/-/g, "/"));
    var b = new Date($("d-b").value.replace(/-/g, "/"));
    if (isNaN(a.getTime()) || isNaN(b.getTime())) { $("d-out").innerHTML = "请选择两个日期"; return; }
    var ms = Math.abs(b - a);
    var days = Math.round(ms / 86400000);
    $("d-out").innerHTML =
      '<div class="ts-row"><b>相差</b><span class="ts-val">' + days + " 天</span></div>" +
      '<div class="ts-row"><b>折合</b><span class="ts-val">' + (days / 7).toFixed(1) + " 周 ／ " + (days / 30.44).toFixed(1) + " 个月</span></div>" +
      '<div class="ts-row"><b>工作日</b><span class="ts-val">' + workdays(a, b) + " 天</span></div>";
  }
  function workdays(a, b) {
    var s = new Date(Math.min(a, b)), e = new Date(Math.max(a, b));
    var n = 0;
    while (s < e) {
      s.setDate(s.getDate() + 1);
      var w = s.getDay();
      if (w !== 0 && w !== 6) n++;
    }
    return n;
  }
  $("d-go").onclick = dateDiff;
  $("d-today").onclick = function () {
    var t = new Date();
    var iso = t.getFullYear() + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate());
    $("d-a").value = iso;
    dateDiff();
  };
  (function () {
    var t = new Date();
    var iso = t.getFullYear() + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate());
    $("d-a").value = iso; $("d-b").value = iso;
    dateDiff();
  })();

  // ===================== 10. 随机抽签 =====================
  $("r-go").onclick = function () {
    var items = $("r-in").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    if (!items.length) { $("r-out").textContent = "先输入几个候选项（每行一个）"; return; }
    var n = Math.min(+$("r-n").value || 1, items.length);
    var pool = items.slice();
    var picked = [];
    for (var i = 0; i < n; i++) {
      var idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    $("r-out").innerHTML = picked.map(function (p) {
      return '<div style="font-size:17px;font-weight:700;color:#2463c7;padding:6px 0">🎯 ' + p + "</div>";
    }).join("");
  };

  // ===================== 11. 大小写/命名转换 =====================
  function convName() {
    var s = $("n-in").value.trim();
    if (!s) { $("n-out").innerHTML = ""; return; }
    var words = s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_\-\s]+/g, " ").trim().split(" ");
    var lower = words.map(function (w) { return w.toLowerCase(); });
    var out = {
      "驼峰 camelCase": lower.map(function (w, i) { return i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1); }).join(""),
      "大驼峰 PascalCase": lower.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(""),
      "下划线 snake_case": lower.join("_"),
      "短横线 kebab-case": lower.join("-"),
      "大写常量 CONSTANT_CASE": lower.join("_").toUpperCase(),
      "标题 Title Case": words.map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join(" "),
    };
    $("n-out").innerHTML = Object.keys(out).map(function (k) {
      return '<div class="ts-row"><b style="min-width:140px">' + k + '</b><span class="ts-val" data-v="' + out[k] + '">' + out[k] + "</span></div>";
    }).join("");
  }
  $("n-in").addEventListener("input", convName);
  $("n-out").addEventListener("click", function (e) {
    var t = e.target;
    if (t.classList.contains("ts-val")) {
      var ta = document.createElement("textarea");
      ta.value = t.dataset.v; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
      var old = t.textContent; t.textContent = "已复制";
      setTimeout(function () { t.textContent = old; }, 900);
    }
  });
})();
