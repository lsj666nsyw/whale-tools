/**
 * 工具搜索过滤功能测试
 * 验证：输入关键词后 nav 只显示匹配项、计数正确、当前项被藏时自动切换、Esc 清空
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
  else { fail++; console.log("  FAIL ", n, d === undefined ? "" : String(d).slice(0, 180)); }
};

(async () => {
  let html = fs.readFileSync(path.join(SITE, "index.html"), "utf8");
  html = html.replace(/<script src="([^"?]+)\?[^"]*"><\/script>/g, '<script src="$1"></script>');
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
    const p = path.join(SITE, src);
    return fs.existsSync(p) ? "<script>\n" + fs.readFileSync(p, "utf8") + "\n</script>" : m;
  });
  const errs = [];
  const dom = new JSDOM(html, {
    runScripts: "dangerously", pretendToBeVisual: true, url: "http://localhost/",
    beforeParse(w) {
      w.addEventListener("error", (e) => errs.push(String(e.message || e.error?.message)));
      const ce = w.console.error;
      w.console.error = function (...a) { errs.push(a.join(" ")); ce.apply(w.console, a); };
    },
  });
  const w = dom.window, d = w.document;
  await sleep(1500);
  const $ = (id) => d.getElementById(id);
  const navBox = $("tool-nav");
  const allBtns = () => [...navBox.querySelectorAll("button[data-t]")];
  const visible = () => allBtns().filter((b) => !b.classList.contains("hide"));

  console.log("[初始状态]");
  ck("搜索框存在", !!$("tool-q"));
  ck("24 个工具全部可见", visible().length === 24, visible().length);
  ck("计数为空（未搜索）", ($("tool-count").textContent || "") === "", JSON.stringify($("tool-count").textContent));

  console.log("\n[关键词过滤]");
  const input = $("tool-q");
  const type = (v) => { input.value = v; input.dispatchEvent(new w.Event("input", { bubbles: true })); };

  type("二维码");
  await sleep(100);
  ck("搜「二维码」只剩 1 个", visible().length === 1, visible().map((b) => b.textContent.trim()).join(","));
  ck("显示的是二维码工具", visible()[0] && visible()[0].dataset.t === "qr");
  ck("计数显示 1/24", ($("tool-count").textContent || "").indexOf("1/24") !== -1, $("tool-count").textContent);

  type("压缩");
  await sleep(100);
  ck("搜「压缩」命中图片压缩", visible().length >= 1 && visible().some((b) => b.dataset.t === "img"), visible().map((b) => b.dataset.t).join(","));

  type("base64");
  await sleep(100);
  ck("搜英文 base64 也命中", visible().some((b) => b.dataset.t === "b64"), visible().map((b) => b.dataset.t).join(","));

  type("身份证");
  await sleep(100);
  ck("搜「身份证」命中", visible().some((b) => b.dataset.t === "idcard"), visible().map((b) => b.dataset.t).join(","));

  console.log("\n[当前项被隐藏时自动切换]");
  // 先选中"日期"，再搜一个不含日期的词
  allBtns().find((b) => b.dataset.t === "date").click();
  await sleep(100);
  ck("当前选中日期", navBox.querySelector("button.on").dataset.t === "date");
  type("哈希");
  await sleep(150);
  const cur = navBox.querySelector("button.on");
  ck("当前项被藏后自动切到可见项", cur && !cur.classList.contains("hide"), cur ? cur.dataset.t : "无");
  ck("对应 section 也切过去了", $("t-hash") && $("t-hash").classList.contains("on"), "当前 on section: " + [...d.querySelectorAll("section.on")].map((s) => s.id).join(","));

  console.log("\n[无匹配与清空]");
  type("zzz不存在的工具");
  await sleep(100);
  ck("无匹配时显示提示", navBox.classList.contains("filtering") && visible().length === 0, "visible=" + visible().length);
  type("");
  await sleep(100);
  ck("清空后恢复全部 24 个", visible().length === 24, visible().length);
  ck("清空后提示消失", !navBox.classList.contains("filtering"));
  ck("清空后计数为空", ($("tool-count").textContent || "") === "", JSON.stringify($("tool-count").textContent));

  console.log("\n[Esc 清空]");
  type("二维码");
  await sleep(80);
  input.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await sleep(80);
  ck("Esc 后恢复全部", visible().length === 24 && input.value === "", `visible=${visible().length} value=${JSON.stringify(input.value)}`);

  console.log("\n[全程无报错]");
  ck("无未捕获错误", errs.length === 0, errs.slice(0, 3).join(" | "));

  console.log("\n" + "=".repeat(48));
  console.log("通过 " + pass + "，失败 " + fail);
  w.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
