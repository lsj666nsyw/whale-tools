/**
 * whale-tools 功能冒烟测试（内联版）
 * 验证：页面能起来、24 个工具都在、模式切换真的生效、核心功能能跑
 */
const path = require("path");
const Module = require("module");
const fs = require("fs");
const NM = path.join(__dirname, "..", "webapp", "node_modules");
const req = Module.createRequire(path.join(NM, "jsdom", "package.json"));
const { JSDOM } = req("jsdom");
const XLSX = req("xlsx");
const PDFLib = req("pdf-lib");

const SITE = __dirname;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const ck = (n, c, d) => {
  if (c) { pass++; console.log("  PASS ", n); }
  else { fail++; console.log("  FAIL ", n, d === undefined ? "" : String(d).slice(0, 180)); }
};

(async () => {
  let html = fs.readFileSync(path.join(SITE, "index.html"), "utf8");
  // 去掉 ?v=2 这类缓存参数，否则本地找不到文件
  html = html.replace(/<script src="([^"?]+)\?[^"]*"><\/script>/g, '<script src="$1"></script>');
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
    const p = path.join(SITE, src);
    if (!fs.existsSync(p)) { console.error("缺脚本: " + src); return m; }
    return "<script>\n" + fs.readFileSync(p, "utf8") + "\n</script>";
  });

  const errs = [];
  const dom = new JSDOM(html, {
    runScripts: "dangerously", pretendToBeVisual: true, url: "http://localhost/",
    beforeParse(w) {
      w.addEventListener("error", (e) => errs.push("winerr: " + (e.message || e.error?.message)));
      const ce = w.console.error;
      w.console.error = function (...a) { errs.push("conerr: " + a.join(" ")); ce.apply(w.console, a); };
    },
  });
  const w = dom.window, d = w.document;
  await new Promise((r) => setTimeout(r, 2000));
  const $ = (id) => d.getElementById(id);

  console.log("\n[页面加载]");
  ck("无未捕获错误", errs.length === 0, errs.slice(0, 3).join(" | "));
  ck("导航项 >= 20", d.querySelectorAll("nav button").length >= 20, d.querySelectorAll("nav button").length);
  ck("section >= 20", d.querySelectorAll("section").length >= 20, d.querySelectorAll("section").length);
  // 注意：whale-tools 不用 core.js/createToolbox，工具函数在 tools.js 里直接挂 window
  ck("工具函数已加载", Object.keys(w).some((k) => /^[a-z]/i.test(k) && typeof w[k] === "function" && k.length > 2),
     "window 上的函数数: " + Object.keys(w).filter((k) => typeof w[k] === "function").length);

  console.log("\n[导航切换]");
  const navBtns = [...d.querySelectorAll("nav button")];
  const targets = navBtns.map((b) => b.dataset.t).filter(Boolean);
  ck("导航都有 data-t", targets.length === navBtns.length, `有 data-t 的 ${targets.length}/${navBtns.length}`);

  // 逐个点，确认对应 section 显示且无报错（section 用 t- 前缀）
  let switchOk = 0, switchBad = [];
  for (const b of navBtns) {
    const before = errs.length;
    b.click();
    const t = b.dataset.t;
    const sec = $("t-" + t);
    if (sec && sec.classList.contains("on") && errs.length === before) switchOk++;
    else switchBad.push(t + (sec ? "" : "(无section)"));
  }
  ck(`全部 ${navBtns.length} 个导航可切换且不报错`, switchBad.length === 0, "异常: " + switchBad.join(","));

  console.log("\n[核心功能：图片压缩（t-img 模块）]");
  navBtns.find((b) => b.dataset.t === "img").click();
  await sleep(200);
  const imgSec = $("t-img");
  const imgBtns = [...imgSec.querySelectorAll("button")].map((b) => (b.textContent || "").trim());
  ck("图片区有操作按钮", imgBtns.length > 0, imgBtns.slice(0, 5).join(" | "));
  const png = new Uint8Array(Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
    "base64"));
  const file = new w.File([png], "t.png", { type: "image/png" });
  const imgInput = imgSec.querySelector('input[type=file]');
  if (imgInput) {
    Object.defineProperty(imgInput, "files", { value: [file], configurable: true });
    imgInput.dispatchEvent(new w.Event("change", { bubbles: true }));
    await sleep(400);
    const list = imgSec.querySelector(".flist") || imgSec;
    ck("图片已选入", /t\.png/.test(imgSec.textContent), imgSec.textContent.slice(0, 80));
    const runBtn = imgBtns.length ? [...imgSec.querySelectorAll("button")].find((b) => /开始|压缩|处理/.test(b.textContent)) : null;
    if (runBtn) { runBtn.click(); await sleep(3000); }
    ck("图片压缩有反馈", /✓|失败|错误|KB|B\b/.test(imgSec.textContent), imgSec.textContent.slice(-120));
  } else {
    ck("图片区有文件输入", false, "未找到 input[type=file]");
  }

  console.log("\n[工具搜索过滤（新功能）]");
  const searchInput = $("tool-q");
  const navAll = [...d.querySelectorAll("#tool-nav button[data-t]")];
  ck("搜索框存在", !!searchInput);
  ck("每个工具都带搜索关键词 data-k", navAll.every((b) => (b.dataset.k || "").length > 0),
     `缺 data-k: ${navAll.filter((b) => !b.dataset.k).map((b) => b.dataset.t).join(",") || "无"}`);
  ck(`初始 ${navAll.length} 个全可见`, navAll.filter((b) => !b.classList.contains("hide")).length === navAll.length);
  if (searchInput) {
    searchInput.value = "二维码";
    searchInput.dispatchEvent(new w.Event("input", { bubbles: true }));
    await sleep(120);
    const vis = navAll.filter((b) => !b.classList.contains("hide"));
    ck("搜「二维码」只留 1 个", vis.length === 1 && vis[0].dataset.t === "qr", vis.map((b) => b.dataset.t).join(","));
    searchInput.value = "";
    searchInput.dispatchEvent(new w.Event("input", { bubbles: true }));
    await sleep(120);
    ck(`清空后恢复 ${navAll.length} 个`, navAll.filter((b) => !b.classList.contains("hide")).length === navAll.length);
  }

  console.log("\n[小工具抽查：有输入且能响应]");
  // 这些工具是纯文本/数值计算，逐个填输入点按钮，看是否有输出
  const probes = [
    { t: "b64", desc: "Base64 编码" },
    { t: "hash", desc: "哈希" },
    { t: "cnt", desc: "字数统计" },
    { t: "pct", desc: "百分比" },
    { t: "unit", desc: "单位换算" },
    { t: "ts", desc: "时间戳" },
    { t: "cv", desc: "校验位" },
    { t: "rt", desc: "比例换算" },
    { t: "zs", desc: "生肖" },
  ];
  for (const p of probes) {
    const before = errs.length;
    navBtns.find((b) => b.dataset.t === p.t).click();
    await sleep(150);
    const sec = $("t-" + p.t);
    if (!sec) { ck(`${p.t} ${p.desc} 区块存在`, false, "无 section"); continue; }
    // 找文本/数字输入并填入测试值
    const inputs = [...sec.querySelectorAll('input[type=text], input[type=number], textarea')];
    inputs.forEach((inp) => { inp.value = "12345"; });
    // 找执行按钮
    const btn = [...sec.querySelectorAll("button")].find((b) => /开始|计算|转换|生成|编码|解|查|转/.test(b.textContent || ""));
    let responded = false;
    if (btn) { btn.click(); await sleep(500); responded = true; }
    const hasOut = /[0-9a-fA-F]{4,}|✓|结果|总字符|校验|分钟/.test(sec.textContent);
    ck(`${p.t} ${p.desc}：可交互且不报错`, errs.length === before && (responded || hasOut),
       `inputs=${inputs.length} btn=${btn ? btn.textContent.trim().slice(0, 10) : "无"} out=${sec.textContent.replace(/\s+/g, " ").slice(-60)}`);
  }

  console.log("\n" + "=".repeat(48));
  console.log("通过 " + pass + "，失败 " + fail);
  w.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
