/* tools2.js —— 第二批工具（12 个），与 tools.js 共用页面 */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function log(box, msg, cls) {
    var d = document.createElement("div");
    if (cls) d.className = cls;
    d.textContent = msg;
    box.appendChild(d);
  }
  function download(name, data, type) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: type || "application/octet-stream" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function copyText(txt, btn) {
    var ta = document.createElement("textarea");
    ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove();
    if (btn) {
      var old = btn.textContent;
      btn.textContent = "已复制";
      setTimeout(function () { btn.textContent = old; }, 1100);
    }
  }
  function row(k, v) {
    return '<div class="ts-row"><b>' + k + '</b><span class="ts-val" data-v="' +
      String(v).replace(/"/g, "&quot;") + '">' + v + "</span></div>";
  }

  // ===================== 12. Base64 编解码 =====================
  function b64encode() {
    var s = $("b64-in").value;
    try {
      var bytes = new TextEncoder().encode(s);
      var bin = "";
      for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      $("b64-out").value = btoa(bin);
      $("b64-stat").textContent = "✓ 编码成功（" + bytes.length + " 字节）";
      $("b64-stat").style.color = "#2fa360";
    } catch (e) {
      $("b64-stat").textContent = "✗ " + e.message;
      $("b64-stat").style.color = "#c04040";
    }
  }
  function b64decode() {
    var s = $("b64-in").value.trim();
    try {
      var bin = atob(s.replace(/\s/g, ""));
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      $("b64-out").value = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      $("b64-stat").textContent = "✓ 解码成功（" + bytes.length + " 字节）";
      $("b64-stat").style.color = "#2fa360";
    } catch (e) {
      $("b64-stat").textContent = "✗ 不是有效的 Base64";
      $("b64-stat").style.color = "#c04040";
    }
  }
  $("b64-enc").onclick = b64encode;
  $("b64-dec").onclick = b64decode;
  $("b64-copy").onclick = function () { copyText($("b64-out").value, this); };
  $("b64-swap").onclick = function () {
    var a = $("b64-in").value; $("b64-in").value = $("b64-out").value; $("b64-out").value = a;
  };

  // ===================== 13. URL 编解码 =====================
  function urlEncode() {
    var s = $("url-in").value;
    var full = $("url-full").checked;
    try {
      $("url-out").value = full ? encodeURI(s) : encodeURIComponent(s);
      $("url-stat").textContent = full ? "✓ 整段编码（保留 :/?&= 等）" : "✓ 全部编码（含 :/?&=）";
      $("url-stat").style.color = "#2fa360";
    } catch (e) {
      $("url-stat").textContent = "✗ " + e.message;
      $("url-stat").style.color = "#c04040";
    }
  }
  function urlDecode() {
    var s = $("url-in").value;
    try {
      $("url-out").value = decodeURIComponent(s);
      $("url-stat").textContent = "✓ 解码成功";
      $("url-stat").style.color = "#2fa360";
    } catch (e) {
      $("url-stat").textContent = "✗ 不是有效的编码串";
      $("url-stat").style.color = "#c04040";
    }
  }
  $("url-enc").onclick = urlEncode;
  $("url-dec").onclick = urlDecode;
  $("url-copy").onclick = function () { copyText($("url-out").value, this); };

  // ===================== 14. 哈希计算 =====================
  // 纯 JS 的 MD5 / SHA-1 / SHA-256 兜底实现（crypto.subtle 在 http 页面下不可用）
  function utf8Bytes(str) {
    if (window.TextEncoder) return new TextEncoder().encode(str);
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return new Uint8Array(out);
  }

  function md5hex(bytes) {
    // 精简 MD5（RFC 1321）
    function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
    function rol(n, c) { return (n << c) | (n >>> (32 - c)); }
    var K = [], S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    for (var i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
    var len = bytes.length;
    var withPad = new Uint8Array((((len + 8) >> 6) + 1) * 64);
    withPad.set(bytes);
    withPad[len] = 0x80;
    var bitLen = len * 8;
    for (var i2 = 0; i2 < 4; i2++) withPad[withPad.length - 8 + i2] = (bitLen >>> (8 * i2)) & 255;
    withPad[withPad.length - 4] = (bitLen / 4294967296) & 255;

    var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (var off = 0; off < withPad.length; off += 64) {
      var M = [];
      for (var j = 0; j < 16; j++) {
        M[j] = withPad[off + j * 4] | (withPad[off + j * 4 + 1] << 8) |
          (withPad[off + j * 4 + 2] << 16) | (withPad[off + j * 4 + 3] << 24);
      }
      var A = a0, B = b0, C = c0, D = d0;
      for (var k = 0; k < 64; k++) {
        var F, g;
        if (k < 16) { F = (B & C) | (~B & D); g = k; }
        else if (k < 32) { F = (D & B) | (~D & C); g = (5 * k + 1) % 16; }
        else if (k < 48) { F = B ^ C ^ D; g = (3 * k + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * k) % 16; }
        var tmp = D;
        D = C;
        C = B;
        var sIdx = (k >> 4) * 4 + (k % 4);
        B = add32(B, rol(add32(add32(A, F), add32(K[k], M[g])), S[sIdx]));
        A = tmp;
      }
      a0 = add32(a0, A); b0 = add32(b0, B); c0 = add32(c0, C); d0 = add32(d0, D);
    }
    function hexLE(n) {
      var s = "";
      for (var i = 0; i < 4; i++) s += ((n >>> (8 * i)) & 255).toString(16).padStart(2, "0");
      return s;
    }
    return hexLE(a0) + hexLE(b0) + hexLE(c0) + hexLE(d0);
  }

  async function doHash() {
    var s = $("hash-in").value;
    var algo = $("hash-algo").value;
    var stat = $("hash-stat");
    if (!s) { stat.textContent = "请先输入内容"; return; }
    var data = utf8Bytes(s);
    var hex = null;
    // 优先用原生（快且标准）
    if (window.crypto && window.crypto.subtle) {
      try {
        var buf = await window.crypto.subtle.digest(algo, data);
        hex = Array.from(new Uint8Array(buf)).map(function (b) {
          return b.toString(16).padStart(2, "0");
        }).join("");
      } catch (e) { hex = null; }
    }
    // 降级：纯 JS 实现
    if (!hex) {
      if (algo === "MD5") hex = md5hex(data);
      else {
        stat.textContent = "✗ 当前环境（非 HTTPS）不支持 " + algo + "，请改用 MD5 或通过 https 访问";
        stat.style.color = "#c04040";
        return;
      }
    }
    $("hash-out").innerHTML = row(algo, hex) + row("长度", hex.length + " 字符");
    stat.textContent = "✓ 计算完成" + (window.crypto && window.crypto.subtle ? "" : "（降级模式）");
    stat.style.color = "#2fa360";
  }
  $("hash-go").onclick = doHash;
  $("hash-out").addEventListener("click", function (e) {
    if (e.target.classList.contains("ts-val")) copyText(e.target.dataset.v, null);
  });

  // ===================== 15. 摩斯密码 =====================
  var MORSE = {
    "a": ".-", "b": "-...", "c": "-.-.", "d": "-..", "e": ".", "f": "..-.",
    "g": "--.", "h": "....", "i": "..", "j": ".---", "k": "-.-", "l": ".-..",
    "m": "--", "n": "-.", "o": "---", "p": ".--.", "q": "--.-", "r": ".-.",
    "s": "...", "t": "-", "u": "..-", "v": "...-", "w": ".--", "x": "-..-",
    "y": "-.--", "z": "--..",
    "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
    "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
    ".": ".-.-.-", ",": "--..--", "?": "..--..", "!": "-.-.--", "/": "-..-.",
    "-": "-....-", "(": "-.--.", ")": "-.--.-", "@": ".--.-.",
  };
  var MORSE_REV = {};
  Object.keys(MORSE).forEach(function (k) { MORSE_REV[MORSE[k]] = k; });

  function morseEncode() {
    var s = $("morse-in").value.toLowerCase();
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === " ") { out.push("/"); continue; }
      if (MORSE[ch]) out.push(MORSE[ch]);
    }
    $("morse-out").value = out.join(" ");
    $("morse-stat").textContent = "✓ 编码完成（不支持的字符会跳过）";
    $("morse-stat").style.color = "#2fa360";
  }
  function morseDecode() {
    var s = $("morse-in").value.trim();
    var words = s.split("/");
    var out = words.map(function (w) {
      return w.trim().split(/\s+/).map(function (code) {
        return MORSE_REV[code] || "?";
      }).join("");
    }).join(" ");
    $("morse-out").value = out;
    $("morse-stat").textContent = "✓ 解码完成";
    $("morse-stat").style.color = "#2fa360";
  }
  $("morse-enc").onclick = morseEncode;
  $("morse-dec").onclick = morseDecode;

  // ===================== 16. 字数统计 =====================
  function countText() {
    var s = $("cnt-in").value;
    var chars = s.length;
    var charsNoSpace = s.replace(/\s/g, "").length;
    var lines = s ? s.split("\n").length : 0;
    var words = s.trim() ? s.trim().split(/\s+/).length : 0;
    // 中文按字算，英文按词算
    var cjk = (s.match(/[\u4e00-\u9fa5]/g) || []).length;
    var digits = (s.match(/\d/g) || []).length;
    var punct = (s.match(/[，。！？、；：""''（）《》]/g) || []).length;
    $("cnt-out").innerHTML =
      row("总字符", chars) + row("不含空格", charsNoSpace) +
      row("中文汉字", cjk) + row("英文单词", words) +
      row("数字", digits) + row("中文标点", punct) +
      row("行数", lines) +
      row("预计阅读", Math.max(1, Math.ceil(chars / 400)) + " 分钟");
  }
  $("cnt-in").addEventListener("input", countText);
  countText();

  // ===================== 17. 简繁转换 =====================
  var S2T = {
    "们": "們", "这": "這", "个": "個", "来": "來", "说": "說", "时": "時",
    "会": "會", "对": "對", "为": "為", "发": "發", "后": "後", "里": "裡",
    "过": "過", "还": "還", "开": "開", "关": "關", "学": "學", "习": "習",
    "书": "書", "车": "車", "门": "門", "问": "問", "间": "間", "电": "電",
    "话": "話", "语": "語", "国": "國", "图": "圖", "马": "馬", "鸟": "鳥",
    "鱼": "魚", "龙": "龍", "买": "買", "卖": "賣", "钱": "錢", "银": "銀",
    "头": "頭", "风": "風", "飞": "飛", "乐": "樂", "长": "長", "万": "萬",
    "与": "與", "专": "專", "业": "業", "东": "東", "丝": "絲", "两": "兩",
    "严": "嚴", "丰": "豐", "临": "臨", "为": "為", "丽": "麗", "举": "舉",
    "义": "義", "乌": "烏", "乔": "喬", "习": "習", "乡": "鄉", "书": "書",
  };
  var T2S = {};
  Object.keys(S2T).forEach(function (k) { T2S[S2T[k]] = k; });

  function convScript(dir) {
    var s = $("sc-in").value;
    var map = dir === "s2t" ? S2T : T2S;
    var out = s.split("").map(function (ch) { return map[ch] || ch; }).join("");
    $("sc-out").value = out;
    var changed = 0;
    for (var i = 0; i < s.length; i++) if (map[s[i]]) changed++;
    $("sc-stat").textContent = "✓ 转换了 " + changed + " 个字";
    $("sc-stat").style.color = "#2fa360";
  }
  $("sc-s2t").onclick = function () { convScript("s2t"); };
  $("sc-t2s").onclick = function () { convScript("t2s"); };
  $("sc-copy").onclick = function () { copyText($("sc-out").value, this); };

  // ===================== 18. 百分比计算 =====================
  function pctCalc() {
    var a = parseFloat($("pct-a").value);
    var b = parseFloat($("pct-b").value);
    var out = $("pct-out");
    if (isNaN(a) || isNaN(b)) { out.innerHTML = "请输入两个数字"; return; }
    var parts = [];
    parts.push(row("A 是 B 的", b !== 0 ? (a / b * 100).toFixed(2) + "%" : "∞"));
    parts.push(row("A 比 B 多", b !== 0 ? ((a - b) / b * 100).toFixed(2) + "%" : "∞"));
    parts.push(row("A 比 B 少", b !== 0 ? ((b - a) / b * 100).toFixed(2) + "%" : "∞"));
    parts.push(row("B 的 A%", (b * a / 100).toFixed(4)));
    parts.push(row("A 的 B%", (a * b / 100).toFixed(4)));
    out.innerHTML = parts.join("");
  }
  $("pct-go").onclick = pctCalc;
  ["pct-a", "pct-b"].forEach(function (id) {
    $(id).addEventListener("input", pctCalc);
  });
  pctCalc();

  // ===================== 19. 随机数 =====================
  function genRand() {
    var min = parseInt($("rn-min").value) || 0;
    var max = parseInt($("rn-max").value) || 100;
    var n = Math.min(100, Math.max(1, parseInt($("rn-count").value) || 1));
    var allowDup = $("rn-dup").checked;
    if (min > max) { var t = min; min = max; max = t; }
    var arr = new Uint32Array(n);
    (window.crypto || window.msCrypto).getRandomValues(arr);
    var out = [];
    var used = {};
    for (var i = 0; i < n; i++) {
      var v = min + (arr[i] % (max - min + 1));
      if (!allowDup) {
        var guard = 0;
        while (used[v] && guard < 200) { v = min + Math.floor(Math.random() * (max - min + 1)); guard++; }
        used[v] = 1;
      }
      out.push(v);
    }
    $("rn-out").innerHTML = out.map(function (v) {
      return '<span class="num-chip">' + v + "</span>";
    }).join("");
  }
  $("rn-go").onclick = genRand;
  genRand();

  // ===================== 20. 身份证校验 =====================
  function checkID() {
    var id = $("id-in").value.trim().toUpperCase();
    var out = $("id-out");
    if (id.length !== 18) {
      out.innerHTML = '<span style="color:#c04040">✗ 身份证号应为 18 位（当前 ' + id.length + " 位）</span>";
      return;
    }
    if (!/^\d{17}[\dX]$/.test(id)) {
      out.innerHTML = '<span style="color:#c04040">✗ 格式不对（前 17 位数字，末位数字或 X）</span>';
      return;
    }
    // 校验码算法
    var w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    var sum = 0;
    for (var i = 0; i < 17; i++) sum += parseInt(id[i]) * w[i];
    var codes = "10X98765432";
    var expect = codes[sum % 11];
    var valid = expect === id[17];

    var year = parseInt(id.substr(6, 4));
    var month = parseInt(id.substr(10, 2));
    var day = parseInt(id.substr(12, 2));
    var birth = year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    var age = new Date().getFullYear() - year;
    var gender = parseInt(id[16]) % 2 === 1 ? "男" : "女";
    var region = id.substr(0, 6);

    out.innerHTML =
      '<div style="font-size:14px;font-weight:700;color:' + (valid ? "#2fa360" : "#c04040") + ';margin-bottom:8px">' +
      (valid ? "✓ 校验码正确" : "✗ 校验码错误（应为 " + expect + "）") + "</div>" +
      row("出生日期", birth) + row("年龄", age + " 岁") +
      row("性别", gender) + row("地区码", region);
  }
  $("id-go").onclick = checkID;

  // ===================== 21. 手机号/邮箱校验 =====================
  function checkContact() {
    var s = $("cv-in").value.trim();
    var out = $("cv-out");
    if (!s) { out.innerHTML = ""; return; }
    var results = [];
    var phone = /^1[3-9]\d{9}$/.test(s);
    var email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
    var url = /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(s);
    var ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(s) && s.split(".").every(function (x) { return +x <= 255; });
    var idcard = /^\d{17}[\dX]$/i.test(s);

    function item(name, ok) {
      return '<div class="ts-row"><b>' + name + '</b><span style="color:' +
        (ok ? "#2fa360" : "#8b95a8") + '">' + (ok ? "✓ 匹配" : "— 不匹配") + "</span></div>";
    }
    results.push(item("手机号", phone));
    results.push(item("邮箱", email));
    results.push(item("网址", url));
    results.push(item("IPv4", ipv4));
    results.push(item("身份证", idcard));
    out.innerHTML = results.join("");
  }
  $("cv-in").addEventListener("input", checkContact);
  $("cv-go").onclick = checkContact;

  // ===================== 22. 代码格式化（简易） =====================
  function fmtCode() {
    var s = $("fmt-in").value;
    var lang = $("fmt-lang").value;
    var out = "";
    if (lang === "json") {
      try { out = JSON.stringify(JSON.parse(s), null, 2); }
      catch (e) { $("fmt-stat").textContent = "✗ " + e.message; $("fmt-stat").style.color = "#c04040"; return; }
    } else if (lang === "sql") {
      // 简单 SQL 美化：关键字大写 + 换行
      var kws = ["SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "INSERT INTO", "UPDATE", "DELETE FROM", "SET", "VALUES", "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "ON", "AND", "OR", "UNION ALL", "UNION"];
      out = s;
      kws.forEach(function (k) {
        out = out.replace(new RegExp("\\b" + k + "\\b", "gi"), "\n" + k);
      });
      out = out.replace(/\n{2,}/g, "\n").trim();
      out = out.replace(/,\s*/g, ",\n  ");
    } else {
      // CSS 美化
      out = s.replace(/\s*\{\s*/g, " {\n  ")
        .replace(/;\s*/g, ";\n  ")
        .replace(/\s*\}/g, "\n}\n")
        .replace(/\n{2,}/g, "\n").trim();
    }
    $("fmt-out").value = out;
    $("fmt-stat").textContent = "✓ 格式化完成";
    $("fmt-stat").style.color = "#2fa360";
  }
  $("fmt-go").onclick = fmtCode;
  $("fmt-copy").onclick = function () { copyText($("fmt-out").value, this); };

  // ===================== 23. 生肖星座 =====================
  function zodiac() {
    var v = $("zs-date").value;
    if (!v) { $("zs-out").innerHTML = ""; return; }
    var d = new Date(v.replace(/-/g, "/"));
    if (isNaN(d.getTime())) { $("zs-out").innerHTML = "日期无效"; return; }
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();

    var animals = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
    var animal = animals[(y - 4) % 12];

    var signs = [
      [1, 20, "水瓶座"], [2, 19, "双鱼座"], [3, 21, "白羊座"], [4, 20, "金牛座"],
      [5, 21, "双子座"], [6, 22, "巨蟹座"], [7, 23, "狮子座"], [8, 23, "处女座"],
      [9, 23, "天秤座"], [10, 24, "天蝎座"], [11, 23, "射手座"], [12, 22, "摩羯座"],
    ];
    var sign = "摩羯座";
    for (var i = 0; i < signs.length; i++) {
      if (m === signs[i][0]) {
        sign = day >= signs[i][1] ? signs[i][2] : (i === 0 ? "摩羯座" : signs[i - 1][2]);
        break;
      }
    }
    var days = ["日", "一", "二", "三", "四", "五", "六"];
    var start = new Date(y, 0, 1);
    var week = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
    $("zs-out").innerHTML =
      row("生肖", animal) + row("星座", sign) +
      row("星期", "星期" + days[d.getDay()]) +
      row("今年第", week + " 周") +
      row("已过", Math.floor((d - start) / 86400000) + " 天") +
      row("剩余", Math.floor((new Date(y, 11, 31) - d) / 86400000) + " 天");
  }
  $("zs-date").addEventListener("change", zodiac);
  $("zs-go").onclick = zodiac;
  (function () {
    var t = new Date();
    $("zs-date").value = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
    zodiac();
  })();

  // ===================== 24. 汇率/比例换算（离线参考） =====================
  function ratioCalc() {
    var a = parseFloat($("rt-a").value) || 0;
    var b = parseFloat($("rt-b").value) || 0;
    var c = parseFloat($("rt-c").value) || 0;
    // a : b = c : x  →  x = b*c/a
    var out = $("rt-out");
    if (a === 0) { out.innerHTML = "A 不能为 0"; return; }
    var x = b * c / a;
    out.innerHTML =
      row("比例", a + " : " + b + " = " + c + " : " + (+x.toPrecision(8))) +
      '<div class="hint" style="margin-top:6px">常用于：配方换算、图纸缩放、单价折算、汇率换算</div>';
  }
  ["rt-a", "rt-b", "rt-c"].forEach(function (id) { $(id).addEventListener("input", ratioCalc); });
  $("rt-go").onclick = ratioCalc;
  ratioCalc();
})();
