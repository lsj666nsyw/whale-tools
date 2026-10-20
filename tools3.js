/* tools3.js —— 第三批工具：全部工具总览 + 计算器 + 文本对比 + JSON/CSV + MD5 + 假文 + 关键字检测 + Emoji */
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
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ===================== MD5（纯 JS，HTTPS 无关） =====================
  // 一份实现，两种入口：
  //   md5(text)      —— 文本，先按 UTF-8 编码（保证中文跨浏览器一致）
  //   md5Bytes(str)  —— 文件，str 已是 latin1 字节串，跳过 UTF-8 转换
  function md5Core(str) {
    function safeAdd(x, y) { var lsw = (x & 0xffff) + (y & 0xffff); return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xffff); }
    function bitRol(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
    function cmn(q, a, b, x, s, t) { return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
    function md5cycle(x, k) {
      var a = x[0], b = x[1], c = x[2], d = x[3];
      a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586);
      c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
      a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426);
      c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
      a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417);
      c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
      a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101);
      c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
      a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632);
      c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
      a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083);
      c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
      a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690);
      c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
      a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784);
      c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
      a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463);
      c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
      a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353);
      c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
      a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222);
      c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
      a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835);
      c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
      a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415);
      c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
      a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606);
      c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
      a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744);
      c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
      a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379);
      c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
      x[0] = safeAdd(a, x[0]); x[1] = safeAdd(b, x[1]); x[2] = safeAdd(c, x[2]); x[3] = safeAdd(d, x[3]);
    }
    function rhex(n) {
      var s = "", j;
      for (j = 0; j < 4; j++) s += "0123456789abcdef".charAt((n >> (j * 8 + 4)) & 0x0f) + "0123456789abcdef".charAt((n >> (j * 8)) & 0x0f);
      return s;
    }
    function hex(x) { for (var i = 0; i < x.length; i++) x[i] = rhex(x[i]); return x.join(""); }
    var n = str.length, state = [1732584193, -271733879, -1732584194, 271733878], i;
    for (i = 64; i <= str.length; i += 64) {
      var S = [];
      for (var j = 0; j < 64; j += 4) {
        var ij = i - 64 + j;
        S[j / 4 | 0] = str.charCodeAt(ij) | (str.charCodeAt(ij + 1) << 8) | (str.charCodeAt(ij + 2) << 16) | (str.charCodeAt(ij + 3) << 24);
      }
      md5cycle(state, S);
    }
    str = str.substring(i - 64);
    var tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < str.length; i++) tail[i >> 2] |= str.charCodeAt(i) << ((i % 4) << 3);
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) { md5cycle(state, tail); for (i = 0; i < 16; i++) tail[i] = 0; }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return hex(state);
  }
  function md5(text) {
    return md5Core(unescape(encodeURIComponent(text)));
  }
  function md5Bytes(latin1) {
    return md5Core(latin1);
  }

  // ===================== 工具注册表（总览页 + 搜索共用） =====================
  // hot: 是否常用（显示橙色标记）；ds: 一句话说明
  var TOOLS = [
    { t: "qr", nm: "二维码生成", ic: "📱", ds: "网址/文字转二维码图", hot: 1 },
    { t: "text", nm: "文本处理", ic: "📝", ds: "去重去空行大小写", hot: 1 },
    { t: "json", nm: "JSON 格式化", ic: "{}", ds: "美化压缩校验 JSON", hot: 1 },
    { t: "b64", nm: "Base64", ic: "🔡", ds: "编解码，支持中文", hot: 1 },
    { t: "url", nm: "URL 编解码", ic: "🔗", ds: "中文网址转义", hot: 1 },
    { t: "hash", nm: "哈希计算", ic: "#️⃣", ds: "SHA/MD5 摘要", hot: 1 },
    { t: "cnt", nm: "字数统计", ic: "🔢", ds: "字符汉字行数阅读时长", hot: 1 },
    { t: "color", nm: "颜色转换", ic: "🎨", ds: "HEX/RGB/HSL 互转", hot: 1 },
    { t: "ts", nm: "时间戳转换", ic: "⏰", ds: "秒/毫秒与日期互转" },
    { t: "pwd", nm: "密码生成", ic: "🔐", ds: "加密级随机密码", hot: 1 },
    { t: "unit", nm: "单位换算", ic: "📏", ds: "长度重量面积数据" },
    { t: "pct", nm: "百分比计算", ic: "％", ds: "涨跌占比折扣", hot: 1 },
    { t: "cv", nm: "格式校验", ic: "✅", ds: "手机邮箱IP网址" },
    { t: "img", nm: "图片压缩", ic: "🖼", ds: "单张压缩限边长", hot: 1 },
    { t: "date", nm: "日期计算", ic: "📅", ds: "相差天数工作日" },
    { t: "sc", nm: "简繁转换", ic: "🈶", ds: "简体繁体互转" },
    { t: "morse", nm: "摩斯密码", ic: "📡", ds: "字母数字转电码" },
    { t: "fmt", nm: "代码格式", ic: "🧹", ds: "JSON/SQL/CSS 美化" },
    { t: "name", nm: "命名转换", ic: "🔤", ds: "驼峰下划线常量" },
    { t: "zs", nm: "生肖星座", ic: "🐲", ds: "生肖星座第几周" },
    { t: "rt", nm: "比例换算", ic: "⚖️", ds: "配方图纸缩放" },
    { t: "rand", nm: "随机抽签", ic: "🎲", ds: "名单随机抽取" },
    { t: "rn", nm: "随机数", ic: "🎯", ds: "范围内不重复" },
    { t: "idcard", nm: "身份证校验", ic: "🆔", ds: "校验码生日性别" },
    { t: "calc", nm: "计算器", ic: "🧮", ds: "四则括号幂三角函数", hot: 1 },
    { t: "diff", nm: "文本对比", ic: "🔍", ds: "逐行找差异", hot: 1 },
    { t: "cvt", nm: "JSON⇄CSV", ic: "🔁", ds: "表格数据互转", hot: 1 },
    { t: "md5", nm: "MD5 计算", ic: "#️⃣", ds: "文本和文件校验" },
    { t: "lt", nm: "假文生成", ic: "📄", ds: "Lorem 占位文本" },
    { t: "gjk", nm: "关键字检测", ic: "🚫", ds: "敏感词标红计数" },
    { t: "emj", nm: "Emoji 选择", ic: "😀", ds: "表情复制筛选" },
  ];

  // 渲染「全部工具」网格
  (function renderAll() {
    var grid = $("all-grid");
    if (!grid) return;
    var html = "";
    TOOLS.forEach(function (x) {
      html += '<button class="gt-item" data-goto="' + x.t + '">' +
        (x.hot ? '<span class="gt-hot">常用</span>' : "") +
        '<span class="gt-ic">' + x.ic + '</span>' +
        '<span class="gt-nm">' + esc(x.nm) + '</span>' +
        '<span class="gt-ds">' + esc(x.ds) + '</span>' +
        '</button>';
    });
    grid.innerHTML = html;
    $("all-count").textContent = TOOLS.length;
    var foot = $("foot-count");
    if (foot) foot.textContent = TOOLS.length;
    // 点卡片 → 切到对应工具
    grid.addEventListener("click", function (e) {
      var b = e.target.closest("[data-goto]");
      if (!b) return;
      var nav = document.querySelector('#tool-nav button[data-t="' + b.dataset.goto + '"]');
      if (nav) nav.click();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  })();

  // ===================== 25. 计算器 =====================
  (function () {
    var exprEl = $("calc-expr"), resEl = $("calc-result"), histEl = $("calc-hist");
    if (!exprEl) return;
    var history = [];

    // 安全的表达式求值：只允许数字、运算符、括号、小数、常见函数
    function evaluate(src) {
      var s = src.trim();
      if (!s) throw new Error("请输入表达式");
      // 白名单校验
      if (!/^[0-9+\-*/%^().,\s a-zπA-Z]*$/.test(s)) throw new Error("含有不支持的字符");
      var js = s
        .replace(/×/g, "*").replace(/÷/g, "/")
        .replace(/π/g, "Math.PI").replace(/(?<![a-zA-Z])e(?![a-zA-Z])/g, "Math.E")
        .replace(/\^/g, "**")
        .replace(/\bsqrt\(/g, "Math.sqrt(")
        .replace(/\bcbrt\(/g, "Math.cbrt(")
        .replace(/\babs\(/g, "Math.abs(")
        .replace(/\bsin\(/g, "Math.sin(").replace(/\bcos\(/g, "Math.cos(").replace(/\btan\(/g, "Math.tan(")
        .replace(/\basin\(/g, "Math.asin(").replace(/\bacos\(/g, "Math.acos(").replace(/\batan\(/g, "Math.atan(")
        .replace(/\blog\(/g, "Math.log10(").replace(/\bln\(/g, "Math.log(")
        .replace(/\bround\(/g, "Math.round(").replace(/\bfloor\(/g, "Math.floor(").replace(/\bceil\(/g, "Math.ceil(")
        .replace(/\bmax\(/g, "Math.max(").replace(/\bmin\(/g, "Math.min(");
      // 百分号：把 20% 变成 (20/100)
      js = js.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
      // 逗号分隔多参数时 Math.max/min 已支持
      var out = Function('"use strict";return (' + js + ");")();
      if (typeof out !== "number" || !isFinite(out)) throw new Error("结果不是有效数字");
      return out;
    }

    function show(v) {
      // 处理浮点误差：最多 10 位小数
      var r = Math.round(v * 1e10) / 1e10;
      return r.toLocaleString("zh-CN", { maximumFractionDigits: 10 });
    }

    function run() {
      try {
        var v = evaluate(exprEl.value);
        resEl.textContent = exprEl.value.trim() + " = " + show(v);
        resEl.style.color = "var(--p2)";
        history.unshift(exprEl.value.trim() + " = " + show(v));
        if (history.length > 20) history.pop();
        renderHist();
      } catch (e) {
        resEl.textContent = "✗ " + e.message;
        resEl.style.color = "#c04040";
      }
    }
    function renderHist() {
      histEl.innerHTML = history.map(function (h, i) {
        var p = h.split("=");
        return '<div class="ch-item" data-i="' + i + '"><span>' + esc(p[0].trim()) + '</span><b>' + esc((p[1] || "").trim()) + '</b></div>';
      }).join("") || '<div class="hint">还没有记录</div>';
    }
    histEl.addEventListener("click", function (e) {
      var it = e.target.closest(".ch-item");
      if (!it) return;
      var h = history[+it.dataset.i];
      if (h) exprEl.value = h.split("=")[0].trim();
    });

    // 键盘
    var keys = [
      ["C", "fn", "clear"], ["(", "op", "("], [")", "op", ")"], ["%", "op", "%"], ["÷", "op", "÷"],
      ["7", "", "7"], ["8", "", "8"], ["9", "", "9"], ["^", "op", "^"], ["√", "fn", "sqrt("],
      ["4", "", "4"], ["5", "", "5"], ["6", "", "6"], ["×", "op", "×"], ["π", "fn", "π"],
      ["1", "", "1"], ["2", "", "2"], ["3", "", "3"], ["-", "op", "-"], ["⌫", "fn", "back"],
      ["0", "", "0"], [".", "", "."], ["=", "eq", "eq"], ["+", "op", "+"], ["清历史", "fn", "clrhist"],
    ];
    var pad = $("calc-pad");
    pad.innerHTML = keys.map(function (k) {
      return '<button class="' + k[1] + '" data-k="' + esc(k[2]) + '">' + esc(k[0]) + "</button>";
    }).join("");
    pad.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      var k = b.dataset.k;
      if (k === "eq") return run();
      if (k === "clear") { exprEl.value = ""; resEl.textContent = "输入表达式后按 = 计算"; resEl.style.color = "var(--p2)"; return; }
      if (k === "back") { exprEl.value = exprEl.value.slice(0, -1); return; }
      if (k === "clrhist") { history = []; renderHist(); return; }
      exprEl.value += k;
      exprEl.focus();
    });

    $("calc-eq").onclick = run;
    $("calc-copy").onclick = function () { copyText(resEl.textContent, this); };
    $("calc-clear").onclick = function () {
      exprEl.value = "";
      resEl.textContent = "输入表达式后按 = 计算";
      resEl.style.color = "var(--p2)";
    };
    exprEl.addEventListener("keydown", function (e) { if (e.key === "Enter") run(); });
    renderHist();
  })();

  // ===================== 26. 文本对比 =====================
  (function () {
    if (!$("diff-go")) return;
    function lcs(a, b) {
      var m = a.length, n = b.length;
      var dp = [];
      for (var i = 0; i <= m; i++) { dp.push(new Array(n + 1).fill(0)); }
      for (i = m - 1; i >= 0; i--) {
        for (var j = n - 1; j >= 0; j--) {
          dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
      var out = [], x = 0, y = 0;
      while (x < m && y < n) {
        if (a[x] === b[y]) { out.push({ t: "same", v: a[x] }); x++; y++; }
        else if (dp[x + 1][y] >= dp[x][y + 1]) { out.push({ t: "del", v: a[x] }); x++; }
        else { out.push({ t: "add", v: b[y] }); y++; }
      }
      while (x < m) { out.push({ t: "del", v: a[x++] }); }
      while (y < n) { out.push({ t: "add", v: b[y++] }); }
      return out;
    }
    function run() {
      var ic = $("diff-ignore-case").checked, tr = $("diff-trim").checked;
      function norm(s) { if (tr) s = s.trim(); return ic ? s.toLowerCase() : s; }
      var a = $("diff-a").value.split("\n").filter(function (l) { return l.trim() !== ""; });
      var b = $("diff-b").value.split("\n").filter(function (l) { return l.trim() !== ""; });
      // 用规范化后的值做比较，但显示原文
      var an = a.map(norm), bn = b.map(norm);
      var d = lcs(an, bn);
      var add = 0, del = 0, same = 0;
      var html = "";
      d.forEach(function (x) {
        if (x.t === "add") { add++; html += '<div class="diff-line add"><span class="mk">+</span>' + esc(x.v) + "</div>"; }
        else if (x.t === "del") { del++; html += '<div class="diff-line del"><span class="mk">-</span>' + esc(x.v) + "</div>"; }
        else { same++; html += '<div class="diff-line same"><span class="mk"> </span>' + esc(x.v) + "</div>"; }
      });
      $("diff-stat").textContent =
        "A 共 " + a.length + " 行，B 共 " + b.length + " 行 → 相同 " + same + " 行，仅 A 有 " + del + " 行，仅 B 有 " + add + " 行";
      // 完全一致时（没有 add/del）给一个明确结论，而不是只列一堆相同的行
      if (add === 0 && del === 0 && same > 0) {
        $("diff-out").innerHTML = '<div class="hint" style="color:#2fa360;font-weight:600">✓ 两段文本完全一致（共 ' + same + " 行相同）</div>" + html;
      } else {
        $("diff-out").innerHTML = html || '<div class="hint">两边都是空的</div>';
      }
    }
    $("diff-go").onclick = run;
    $("diff-swap").onclick = function () {
      var t = $("diff-a").value;
      $("diff-a").value = $("diff-b").value;
      $("diff-b").value = t;
      run();
    };
    ["diff-a", "diff-b"].forEach(function (id) { $(id).addEventListener("input", run); });
  })();

  // ===================== 27. JSON ⇄ CSV =====================
  (function () {
    if (!$("cvt-go")) return;
    var mode = "j2c";
    var seg = $("cvt-mode");
    seg.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      seg.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      mode = b.dataset.v;
      $("cvt-in").placeholder = mode === "j2c"
        ? 'JSON 模式：[{"姓名":"张三","分数":90},{"姓名":"李四","分数":85}]'
        : "CSV 模式：\n姓名,分数\n张三,90\n李四,85";
    });
    function j2c() {
      var data = JSON.parse($("cvt-in").value);
      if (!Array.isArray(data) || !data.length) throw new Error("JSON 需要是「对象数组」且不能为空");
      var keys = [];
      data.forEach(function (r) {
        if (typeof r !== "object" || r === null) throw new Error("数组元素必须是对象");
        Object.keys(r).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
      });
      function cell(v) {
        if (v === null || v === undefined) v = "";
        if (typeof v === "object") v = JSON.stringify(v);
        v = String(v);
        return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }
      var lines = [keys.map(cell).join(",")];
      data.forEach(function (r) { lines.push(keys.map(function (k) { return cell(r[k]); }).join(",")); });
      return lines.join("\n");
    }
    function c2j() {
      var lines = $("cvt-in").value.replace(/\r\n?/g, "\n").split("\n").filter(function (l) { return l.trim() !== ""; });
      if (lines.length < 2) throw new Error("至少需要表头 + 1 行数据");
      function parseLine(l) {
        var out = [], cur = "", q = false;
        for (var i = 0; i < l.length; i++) {
          var c = l[i];
          if (q) {
            if (c === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; }
            else cur += c;
          } else if (c === '"') q = true;
          else if (c === ",") { out.push(cur); cur = ""; }
          else cur += c;
        }
        out.push(cur);
        return out;
      }
      var head = parseLine(lines[0]).map(function (h) { return h.trim(); });
      var rows = [];
      for (var i = 1; i < lines.length; i++) {
        var cells = parseLine(lines[i]);
        var o = {};
        head.forEach(function (h, k) {
          var v = (cells[k] || "").trim();
          o[h] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : (v === "true" ? true : v === "false" ? false : v);
        });
        rows.push(o);
      }
      return JSON.stringify(rows, null, 2);
    }
    function run() {
      try {
        var out = mode === "j2c" ? j2c() : c2j();
        $("cvt-out").value = out;
        var bom = $("cvt-bom").checked && mode === "j2c";
        $("cvt-stat").textContent = "✓ 转换成功" + (bom ? "（将带 BOM 导出）" : "") + "，结果 " + out.length + " 字符";
        $("cvt-stat").style.color = "#2fa360";
      } catch (e) {
        $("cvt-stat").textContent = "✗ " + e.message;
        $("cvt-stat").style.color = "#c04040";
      }
    }
    $("cvt-go").onclick = run;
    $("cvt-copy").onclick = function () { copyText($("cvt-out").value, this); };
    $("cvt-dl").onclick = function () {
      var out = $("cvt-out").value;
      if (!out) { $("cvt-stat").textContent = "✗ 先转换再下载"; $("cvt-stat").style.color = "#c04040"; return; }
      if (mode === "j2c") {
        var bom = $("cvt-bom").checked ? "\ufeff" : "";
        download("转换结果.csv", new TextEncoder().encode(bom + out), "text/csv");
      } else {
        download("转换结果.json", new TextEncoder().encode(out), "application/json");
      }
    };
  })();

  // ===================== 28. MD5 =====================
  (function () {
    if (!$("md5-tgo")) return;
    var out = $("md5-out");
    function row(name, hash) {
      return '<div class="ts-row"><b>' + esc(name) + '</b><span class="ts-val" data-v="' + hash + '">' + hash + "</span></div>";
    }
    $("md5-tgo").onclick = function () {
      // 注意：空字符串的 MD5 是合法且有意义的（d41d8cd9...），
      // 所以这里不能因为"没输入"就拒绝，只在完全没碰过输入框时提示。
      var t = $("md5-text").value;
      out.innerHTML = row("文本 MD5", md5(t));
    };
    $("md5-fpick").onclick = function () { $("md5-file").click(); };
    $("md5-file").onchange = async function () {
      var files = this.files;
      if (!files.length) return;
      out.innerHTML = '<div class="hint">计算中…</div>';
      var html = "";
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        try {
          var buf = await new Promise(function (res, rej) {
            var r = new FileReader();
            r.onload = function () { res(r.result); };
            r.onerror = function () { rej(new Error("读取失败")); };
            r.readAsArrayBuffer(f);
          });
          var u8 = new Uint8Array(buf);
          // 分块转 latin1 串，避免大文件时 String.fromCharCode.apply 参数超限
          var s = "", CH = 8192;
          for (var off = 0; off < u8.length; off += CH) {
            s += String.fromCharCode.apply(null, u8.subarray(off, off + CH));
          }
          html += row(f.name + "（" + (f.size / 1024).toFixed(1) + " KB）", md5Bytes(s));
        } catch (e) {
          html += '<div class="hint" style="color:#c04040">✗ ' + esc(f.name) + "：" + esc(e.message) + "</div>";
        }
      }
      out.innerHTML = html;
      this.value = "";
    };
    out.addEventListener("click", function (e) {
      var v = e.target.closest(".ts-val");
      if (v) copyText(v.dataset.v);
    });
  })();

  // ===================== 29. Lorem 假文 =====================
  (function () {
    if (!$("lt-go")) return;
    var CN = "数据接口设计需要考虑扩展性，我们在实践中总结出几条原则。首先是保持简单，避免过早优化。其次是明确边界，每个模块只负责一件事。最后是留有余地，为将来的变化预留空间。好的架构不是一开始就完美无缺，而是在迭代中逐步清晰。文档和代码同样重要，写清楚为什么这么写，比写清楚做了什么更有价值。测试是信心的来源，覆盖关键路径比追求覆盖率数字更有意义。团队协作中，统一的代码风格能减少很多无谓的争论。";
    var EN = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur";
    function gen() {
      var cn = $("lt-cn").checked;
      var src = cn ? CN : EN;
      var type = $("lt-type").value;
      var n = Math.max(1, Math.min(50, +$("lt-n").value || 3));
      var out = $("lt-out");
      var sents = src.replace(/[。.]/g, "|").split("|").filter(Boolean);
      var words = src.replace(/[。.,，、\s]+/g, " ").split(" ").filter(Boolean);
      var html = "";
      if (type === "para") {
        for (var i = 0; i < n; i++) {
          var p = [];
          for (var j = 0; j < 4; j++) p.push(sents[(i * 4 + j) % sents.length]);
          html += "<p>" + p.join(cn ? "" : " ") + (cn ? "" : ".") + "</p>";
        }
      } else if (type === "sent") {
        for (i = 0; i < n; i++) html += "<p>" + sents[i % sents.length] + (cn ? "" : ".") + "</p>";
      } else if (type === "word") {
        var w = [];
        for (i = 0; i < n; i++) w.push(words[i % words.length]);
        html = "<p>" + w.join(cn ? "" : " ") + "</p>";
      } else {
        for (i = 0; i < n; i++) html += "<p>· " + sents[i % sents.length] + "</p>";
      }
      out.innerHTML = html;
    }
    $("lt-go").onclick = gen;
    $("lt-copy").onclick = function () {
      var txt = $("lt-out").innerText;
      copyText(txt, this);
    };
    gen();
  })();

  // ===================== 30. 关键字检测 =====================
  (function () {
    if (!$("gjk-go")) return;
    function parseKeys() {
      var raw = $("gjk-keys").value;
      var list = raw.split(/[\n,，;；]/).map(function (s) { return s.trim(); }).filter(Boolean);
      return list;
    }
    function run() {
      var keys = parseKeys();
      if (!keys.length) { $("gjk-stat").textContent = "✗ 先填写关键字"; $("gjk-stat").style.color = "#c04040"; return; }
      var text = $("gjk-in").value;
      if (!text) { $("gjk-stat").textContent = "✗ 先填写要检测的文本"; $("gjk-stat").style.color = "#c04040"; return; }
      var ci = $("gjk-ci").checked;
      var useRe = $("gjk-re").checked;
      var counts = {};
      keys.forEach(function (k) { counts[k] = 0; });
      // 逐关键字替换为 <mark>
      var outHtml = esc(text);
      keys.forEach(function (k) {
        var re;
        try {
          re = useRe ? new RegExp(k, "g" + (ci ? "i" : "")) : new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g" + (ci ? "i" : ""));
        } catch (e) { return; }
        var m;
        var tmp = outHtml;
        // 在转义后的文本上匹配，用占位符避免重复标记
        var n = 0;
        outHtml = outHtml.replace(re, function (hit) { n++; return "\u0000" + hit + "\u0001"; });
        counts[k] += n;
      });
      outHtml = outHtml.replace(/\u0000/g, "<mark>").replace(/\u0001/g, "</mark>");
      $("gjk-out").innerHTML = outHtml.replace(/\n/g, "<br>");
      var total = keys.reduce(function (s, k) { return s + counts[k]; }, 0);
      var hitKeys = keys.filter(function (k) { return counts[k] > 0; });
      $("gjk-stat").textContent = total
        ? "✗ 命中 " + total + " 处，涉及 " + hitKeys.length + " 个关键字：" + hitKeys.map(function (k) { return k + "×" + counts[k]; }).join("、")
        : "✓ 未命中任何关键字";
      $("gjk-stat").style.color = total ? "#c04040" : "#2fa360";
    }
    $("gjk-go").onclick = run;
    $("gjk-copy").onclick = function () { copyText($("gjk-in").value, this); };
  })();

  // ===================== 31. Emoji =====================
  (function () {
    if (!$("emj-grid")) return;
    var DATA = {
      face: "😀😃😄😁😆😅🤣😂🙂🙃😉😊😇🥰😍🤩😘😗😚😙😋😛😜🤪😝🤑🤗🤭🤫🤔🤐🤨😐😑😶😏😒🙄😬🤥😌😔😪🤤😴😷🤒🤕🤢🤮🤧🥵🥶🥴😵🤯🤠🥳😎🤓🧐😕😟🙁☹️😮😯😲😳🥺😦😧😨😰😥😢😭😱😖😣😞😓😩😫🥱😤😡😠🤬😈👿💀☠️💩🤡👹👺👻👽👾🤖😺😸😹😻😼😽🙀😿😾",
      gest: "👋🤚🖐️✋🖖👌🤌🤏✌️🤞🤟🤘🤙👈👉👆🖕👇☝️👍👎✊👊🤛🤜👏🙌👐🤲🤝🙏✍️💅🤳💪🦾🦿🦵🦶👂🦻👃🧠🦷🦴👀👁️👅👄💋🩸",
      animal: "🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐽🐸🐵🙈🙉🙊🐒🐔🐧🐦🐤🐣🐥🦆🦅🦉🦇🐺🐗🐴🦄🐝🐛🦋🐌🐞🐜🦟🦗🕷️🕸️🦂🐢🐍🦎🦖🦕🐙🦑🦐🦞🦀🐡🐠🐟🐬🐳🐋🦈🐊🐅🐆🦓🦍🦧🐘🦛🦏🐪🐫🦒🦘🐃🐂🐄🐎🐖🐏🐑🦙🐐🦌🐕🐩🦮🐈🐓🦃🦤🦚🦜🦢🦩🕊️🐇🦝🦨🦡🦫🦦🦥🐁🐀🐿️🦔",
      food: "🍏🍎🍐🍊🍋🍌🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝🍅🍆🥑🥦🥬🥒🌶️🫑🌽🥕🫒🧄🧅🥔🍠🥐🥯🍞🥖🥨🧀🥚🍳🧈🥞🧇🥓🥩🍗🍖🦴🌭🍔🍟🍕🫓🥪🥙🧆🌮🌯🫔🥗🥘🫕🥫🍝🍜🍲🍛🍣🍱🥟🦪🍤🍙🍚🍘🍥🥠🥮🍢🍡🍧🍨🍦🥧🧁🍰🎂🍮🍭🍬🍫🍿🍩🍪🌰🥜🍯🥛🍼☕🍵🧃🥤🧋🍶🍺🍻🥂🍷🥃🍸🍹🧉🍾🧊🥄🍴🍽️🥣🥡🥢🧂",
      act: "⚽🏀🏈⚾🥎🎾🏐🏉🥏🎱🪀🏓🏸🥊🥋🥅⛳⛸️🎣🤿🎽🎿🛷🥌🎯🪁🎮🕹️🎲🧩♟️🎭🎨🎬🎤🎧🎼🎹🥁🎷🎺🎸🪕🎻🎲🏆🥇🥈🥉🏅🎖️🏵️🎗️🎫🎟️🎪🤹🎪🎠🎡🎢🚂🚃🚄🚅🚆🚇🚈🚉🚊🚝🚞🚋🚌🚍🚎🚐🚑🚒🚓🚔🚕🚖🚗🚘🚙🛻🚚🚛🚜🏎️🏍️🛵🛺🚲🛴🚏🛣️🛤️⛽🚨🚥🚦🛑🚧⚓⛵🛶🚤🛳️⛴️🛥️🚢✈️🛩️🛫🛬🪂💺🚁🚟🚠🚡🛰️🚀🛸",
      obj: "⌚📱📲💻⌨️🖥️🖨️🖱️🖲️🕹️💽💾💿📀📼📷📸📹🎥📽️🎞️📞☎️📟📠📺📻🎙️⏰⏲️⏱️🕰️⌛⏳📡🔋🔌💡🔦🕯️🪔🧯🛢️💸💵💴💶💷💰💳💎⚖️🪜🧰🪛🔧🔨⚒️🛠️⛏️🪚🔩⚙️🪤🧱⛓️🧲🔫💣🧨🪓🔪🗡️⚔️🛡️🚬⚰️🪦⚱️🏺🔮📿🧿💈⚗️🔭🔬🕳️🩹🩺💊💉🩸🧬🦠🧫🧪🌡️🧹🧺🧻🚽🚰🚿🛁🛀🧼🪥🪒🧽🪣🧴🛎️🔑🗝️🚪🪑🛋️🛏️🛌🧸🖼️🪞🪟🛍️🛒🎁🎈🎏🎀🪄🪅🎊🎉🎎🏮🎐🧧✉️📩📨📧💌📥📤📦🏷️📪📫📬📭📮📯📜📃📄📑🧾📊📈📉🗒️🗓️📆📅🗑️📇🗃️🗳️🗄️📋📁📂🗂️🗞️📰🔓🔒🔏🔐",
    };
    var NAMES = { face: "笑脸情绪", gest: "手势身体", animal: "动物自然", food: "食物饮料", act: "活动旅行", obj: "物品符号" };
    var all = [];
    Object.keys(DATA).forEach(function (k) {
      Array.from(DATA[k]).forEach(function (e) { all.push({ e: e, c: k }); });
    });
    function render() {
      var q = $("emj-q").value.trim().toLowerCase();
      var cat = $("emj-cat").value;
      // emoji 无法按中文关键词匹配，用分类 + 字符搜索（支持直接输入 emoji 或其别名片段）
      var list = all.filter(function (x) {
        if (cat !== "all" && x.c !== cat) return false;
        if (!q) return true;
        return x.e.indexOf(q) !== -1;
      });
      $("emj-grid").innerHTML = list.map(function (x) {
        return '<button data-e="' + x.e + '" title="' + NAMES[x.c] + '">' + x.e + "</button>";
      }).join("") || '<div class="hint">没有匹配的表情</div>';
      $("emj-stat").textContent = "共 " + list.length + " 个，点一下即复制";
    }
    $("emj-grid").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-e]");
      if (!b) return;
      copyText(b.dataset.e);
      var old = b.style.borderColor;
      b.style.borderColor = "var(--p)";
      b.style.background = "#f3efff";
      setTimeout(function () { b.style.borderColor = old; b.style.background = "#fff"; }, 500);
    });
    $("emj-q").addEventListener("input", render);
    $("emj-cat").addEventListener("change", render);
    render();
  })();
})();
