/**
 * 新增工具测试：总览页 + 计算器 + 文本对比 + JSON/CSV + MD5 + 假文 + 关键字 + Emoji
 * 共 8 个新功能，逐个数值断言，不用"看起来对"敷衍。
 */
const path = require("path");
const Module = require("module");
const fs = require("fs");
const NM = path.join(__dirname, "..", "webapp", "node_modules");
const req = Module.createRequire(path.join(NM, "jsdom", "package.json"));
const { JSDOM } = req("jsdom");
const SITE = __dirname;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const ck = (n, c, d) => {
  if (c) { pass++; console.log("  PASS ", n); }
  else { fail++; console.log("  FAIL ", n, d === undefined ? "" : String(d).slice(0, 200)); }
};

function load() {
  let html = fs.readFileSync(path.join(SITE, "index.html"), "utf8");
  html = html.replace(/<script src="([^"?]+)\?[^"]*"><\/script>/g, '<script src="$1"></script>');
  return html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
    const p = path.join(SITE, src);
    return fs.existsSync(p) ? "<script>\n" + fs.readFileSync(p, "utf8") + "\n</script>" : m;
  });
}

async function open() {
  const errs = [];
  const dom = new JSDOM(load(), {
    runScripts: "dangerously", pretendToBeVisual: true, url: "http://localhost/",
    beforeParse(w) {
      w.addEventListener("error", (e) => errs.push(String(e.message || e.error?.message)));
      const ce = w.console.error;
      w.console.error = function (...a) { errs.push(a.join(" ")); ce.apply(w.console, a); };
    },
  });
  const w = dom.window, d = w.document;
  await sleep(1800);
  return { w, d, errs, $: (id) => d.getElementById(id) };
}

(async () => {
  const { w, d, errs, $ } = await open();
  const navAll = [...d.querySelectorAll("#tool-nav button[data-t]")];

  console.log("[结构：31 个工具全部注册]");
  // 31 个工具 + 1 个「全部工具」入口 = 32 个导航按钮
  ck("导航项 = 32（31 工具 + 总览入口）", navAll.length === 32, navAll.length);
  const missing = navAll.filter((b) => !$("t-" + b.dataset.t)).map((b) => b.dataset.t);
  ck("每个导航都有对应 section", missing.length === 0, "缺 section: " + missing.join(","));
  ck("默认显示「全部工具」页", $("t-all") && $("t-all").classList.contains("on"));
  ck("总览页渲染出 31 张卡片", d.querySelectorAll("#all-grid .gt-item").length === 31, d.querySelectorAll("#all-grid .gt-item").length);
  ck("页脚数字同步为 31", $("foot-count").textContent === "31", $("foot-count").textContent);
  ck("计数徽标同步", $("all-count").textContent === "31", $("all-count").textContent);
  const hotCount = d.querySelectorAll("#all-grid .gt-hot").length;
  ck("常用工具有标记", hotCount >= 10, hotCount);

  console.log("\n[总览页点卡片能跳转]");
  const firstCard = d.querySelector('#all-grid [data-goto="calc"]');
  firstCard.click();
  await sleep(200);
  ck("点「计算器」卡片跳到计算器", $("t-calc").classList.contains("on") && d.querySelector('#tool-nav button[data-t="calc"]').classList.contains("on"));

  console.log("\n[25. 计算器]");
  const expr = $("calc-expr"), res = $("calc-result");
  const calc = (e) => { expr.value = e; $("calc-eq").click(); };
  calc("1+2*3"); ck("1+2*3 = 7", res.textContent.includes("= 7"), res.textContent);
  // (12+8)*3.5 = 70，20% 在此按 0.2 参与运算（百分比字面量），故 70-0.2 = 69.8
  calc("(12+8)*3.5-20%"); ck("(12+8)*3.5-20% = 69.8", res.textContent.includes("= 69.8"), res.textContent);
  // 结果带千分位分隔，1,024
  calc("2^10"); ck("2^10 = 1024（千分位显示）", res.textContent.replace(/,/g, "").includes("= 1024"), res.textContent);
  calc("sqrt(144)"); ck("sqrt(144) = 12", res.textContent.includes("= 12"), res.textContent);
  calc("10/3"); ck("10/3 小数正确", res.textContent.includes("3.333333333"), res.textContent);
  calc("0.1+0.2"); ck("0.1+0.2 无浮点误差（=0.3）", res.textContent.includes("= 0.3"), res.textContent);
  calc("max(3,9,2)"); ck("max(3,9,2) = 9", res.textContent.includes("= 9"), res.textContent);
  calc("alert(1)"); ck("危险输入被拒绝", /✗/.test(res.textContent), res.textContent);
  calc("1+"); ck("不完整表达式报错", /✗/.test(res.textContent), res.textContent);
  ck("历史记录有内容", d.querySelectorAll("#calc-hist .ch-item").length >= 5, d.querySelectorAll("#calc-hist .ch-item").length);

  console.log("\n[26. 文本对比]");
  $("diff-a").value = "苹果\n香蕉\n橙子\n葡萄";
  $("diff-b").value = "苹果\n香蕉\n西瓜\n葡萄\n芒果";
  $("diff-go").click();
  await sleep(200);
  const dStat = $("diff-stat").textContent;
  ck("统计正确（相同3，仅A有1，仅B有2）", /相同 3 行/.test(dStat) && /仅 A 有 1 行/.test(dStat) && /仅 B 有 2 行/.test(dStat), dStat);
  ck("标出新增「西瓜」「芒果」", /diff-line add/.test($("diff-out").innerHTML) && /西瓜/.test($("diff-out").textContent));
  ck("标出删除「橙子」", /橙子/.test($("diff-out").textContent) && /del/.test($("diff-out").innerHTML));
  $("diff-b").value = "苹果\n香蕉\n橙子\n葡萄";
  $("diff-go").click();
  await sleep(200);
  ck("完全一致时给提示", /完全一致/.test($("diff-out").textContent), $("diff-out").textContent.slice(0, 60));

  console.log("\n[27. JSON ⇄ CSV]");
  $("cvt-in").value = '[{"姓名":"张三","分数":90},{"姓名":"李四","分数":85}]';
  $("cvt-go").click();
  await sleep(150);
  let out = $("cvt-out").value;
  ck("JSON→CSV 表头正确", out.split("\n")[0] === "姓名,分数", JSON.stringify(out.split("\n")[0]));
  ck("JSON→CSV 数据行正确", out.includes("张三,90") && out.includes("李四,85"), out);
  // 逗号要转义
  $("cvt-in").value = '[{"a":"x,y"}]';
  $("cvt-go").click();
  await sleep(150);
  ck("含逗号的值被引号包裹", $("cvt-out").value.includes('"x,y"'), $("cvt-out").value);
  // 切到 C2J
  [...d.querySelectorAll("#cvt-mode button")].find((b) => b.dataset.v === "c2j").click();
  $("cvt-in").value = "姓名,分数\n张三,90\n李四,85";
  $("cvt-go").click();
  await sleep(150);
  let j = null;
  try { j = JSON.parse($("cvt-out").value); } catch (_) {}
  ck("CSV→JSON 结构正确", j && j.length === 2 && j[0]["姓名"] === "张三" && j[0]["分数"] === 90, $("cvt-out").value.slice(0, 80));
  // 引号转义
  $("cvt-in").value = 'a,b\n"x,y",2';
  $("cvt-go").click();
  await sleep(150);
  let j2 = null;
  try { j2 = JSON.parse($("cvt-out").value); } catch (_) {}
  ck("CSV 引号转义解析正确", j2 && j2[0].a === "x,y" && j2[0].b === 2, $("cvt-out").value.slice(0, 80));
  // 错误输入
  $("cvt-in").value = "{不是数组}";
  [...d.querySelectorAll("#cvt-mode button")].find((b) => b.dataset.v === "j2c").click();
  $("cvt-go").click();
  await sleep(150);
  ck("非法 JSON 给出错误提示", /✗/.test($("cvt-stat").textContent), $("cvt-stat").textContent);

  console.log("\n[28. MD5]");
  $("md5-text").value = "abc";
  $("md5-tgo").click();
  await sleep(100);
  ck("MD5('abc') = 900150983cd24fb0d6963f7d28e17f72", $("md5-out").textContent.includes("900150983cd24fb0d6963f7d28e17f72"), $("md5-out").textContent);
  $("md5-text").value = "";
  $("md5-tgo").click();
  await sleep(100);
  ck("MD5('') = d41d8cd98f00b204e9800998ecf8427e", $("md5-out").textContent.includes("d41d8cd98f00b204e9800998ecf8427e"), $("md5-out").textContent);
  $("md5-text").value = "鲸鱼";
  $("md5-tgo").click();
  await sleep(100);
  // 中文 MD5 用 UTF-8 编码，"鲸鱼" 的 MD5 是固定值
  ck("中文 MD5 为 32 位十六进制", /[0-9a-f]{32}/.test($("md5-out").textContent), $("md5-out").textContent.slice(0, 60));

  console.log("\n[29. Lorem 假文]");
  $("lt-n").value = "3";
  $("lt-type").value = "para";
  $("lt-go").click();
  await sleep(100);
  ck("段落模式生成 3 段", d.querySelectorAll("#lt-out p").length === 3, d.querySelectorAll("#lt-out p").length);
  $("lt-type").value = "li";
  $("lt-go").click();
  await sleep(100);
  ck("列表项模式有 3 项", d.querySelectorAll("#lt-out p").length === 3 && d.querySelectorAll("#lt-out p")[0].textContent.startsWith("·"));

  console.log("\n[30. 关键字检测]");
  $("gjk-keys").value = "免费,最强";
  $("gjk-in").value = "这是免费的最强的工具，完全免费。";
  $("gjk-go").click();
  await sleep(150);
  ck("命中 3 处（免费×2 + 最强×1）", /命中 3 处/.test($("gjk-stat").textContent), $("gjk-stat").textContent);
  ck("关键字被 <mark> 标红", $("gjk-out").querySelectorAll("mark").length === 3, $("gjk-out").querySelectorAll("mark").length);
  $("gjk-in").value = "没有任何关键字";
  $("gjk-go").click();
  await sleep(150);
  ck("未命中时提示通过", /未命中/.test($("gjk-stat").textContent), $("gjk-stat").textContent);
  $("gjk-keys").value = "\\d+";
  $("gjk-re").checked = true;
  $("gjk-in").value = "abc123def456";
  $("gjk-go").click();
  await sleep(150);
  ck("正则模式匹配数字", /命中 2 处/.test($("gjk-stat").textContent), $("gjk-stat").textContent);

  console.log("\n[31. Emoji]");
  const emjCount = d.querySelectorAll("#emj-grid button").length;
  ck("Emoji 加载了 300+ 个", emjCount > 300, emjCount);
  $("emj-cat").value = "food";
  $("emj-cat").dispatchEvent(new w.Event("change", { bubbles: true }));
  await sleep(100);
  ck("按分类筛选生效", d.querySelectorAll("#emj-grid button").length > 0 && d.querySelectorAll("#emj-grid button").length < emjCount, d.querySelectorAll("#emj-grid button").length);

  console.log("\n[搜索仍正常（含新工具）]");
  const si = $("tool-q");
  si.value = "计算器";
  si.dispatchEvent(new w.Event("input", { bubbles: true }));
  await sleep(150);
  const vis = navAll.filter((b) => !b.classList.contains("hide"));
  ck("搜「计算器」命中", vis.length === 1 && vis[0].dataset.t === "calc", vis.map((b) => b.dataset.t).join(","));
  si.value = "csv";
  si.dispatchEvent(new w.Event("input", { bubbles: true }));
  await sleep(150);
  ck("搜 csv 命中 JSON⇄CSV", navAll.filter((b) => !b.classList.contains("hide")).some((b) => b.dataset.t === "cvt"));
  si.value = "";
  si.dispatchEvent(new w.Event("input", { bubbles: true }));
  await sleep(150);

  console.log("\n[全部 31 个导航可切换且不报错]");
  let bad = [];
  for (const b of navAll) {
    const before = errs.length;
    b.click();
    const sec = $("t-" + b.dataset.t);
    if (!sec || !sec.classList.contains("on") || errs.length !== before) bad.push(b.dataset.t);
  }
  ck("无异常", bad.length === 0, "异常: " + bad.join(","));
  ck("全程无未捕获错误", errs.length === 0, errs.slice(0, 3).join(" | "));

  console.log("\n" + "=".repeat(56));
  console.log("通过 " + pass + "，失败 " + fail);
  w.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
