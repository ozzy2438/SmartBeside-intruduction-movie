import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { cues, DURATION, FPS } from "./timeline.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const stillsOnly = args.includes("--stills");
const timeFlag = args.indexOf("--time");
const singleTime = timeFlag >= 0 ? Number(args[timeFlag + 1]) : null;

const STILLS = [1.0, 12.0, 24.5, 26.6, 34.2];

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".png": "image/png",
};

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const rel = decodeURIComponent(url.pathname);
    const filePath = path.normalize(path.join(root, rel));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": mime[path.extname(filePath)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function writeCues() {
  const file = path.join(root, "audio", "cues.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({
    duration: DURATION,
    sampleRate: 48000,
    events: cues,
  }, null, 2));
}

async function main() {
  writeCues();
  const server = await startServer();
  const { port } = server.address();
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      "--hide-scrollbars",
      "--force-color-profile=srgb",
      "--window-size=1920,1080",
    ],
  });

  try {
    const page = await browser.newPage();
    page.on("pageerror", (err) => console.error("pageerror", err));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("console", msg.text());
    });
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${port}/film/index.html?controlled=1`, {
      waitUntil: "networkidle0",
      timeout: 120000,
    });
    await page.waitForFunction("window.__ready === true", { timeout: 120000 });
    const glRenderer = await page.evaluate(() => window.__glRenderer);
    console.log(`WebGL renderer: ${glRenderer}`);

    const jobs = [];
    if (singleTime != null && !Number.isNaN(singleTime)) {
      jobs.push({ frame: Math.round(singleTime * FPS), file: path.join(root, "proof", `t-${singleTime.toFixed(2)}.jpg`) });
    } else if (stillsOnly) {
      for (const t of STILLS) {
        jobs.push({
          frame: Math.round(t * FPS),
          file: path.join(root, "proof", `t-${t.toFixed(2)}.jpg`),
        });
      }
    } else {
      const frameDir = path.join(root, "frames");
      fs.mkdirSync(frameDir, { recursive: true });
      const total = Math.round(DURATION * FPS);
      for (let frame = 0; frame < total; frame += 1) {
        jobs.push({
          frame,
          file: path.join(frameDir, `frame_${String(frame).padStart(4, "0")}.jpg`),
        });
      }
    }

    fs.mkdirSync(path.dirname(jobs[0].file), { recursive: true });
    const started = Date.now();
    for (let i = 0; i < jobs.length; i += 1) {
      const job = jobs[i];
      await page.evaluate((frame) => window.renderFrame(frame), job.frame);
      await page.screenshot({
        path: job.file,
        type: "jpeg",
        quality: 93,
        clip: { x: 0, y: 0, width: 1920, height: 1080 },
      });
      if (i === 0 || (i + 1) % 24 === 0 || i === jobs.length - 1) {
        const elapsed = (Date.now() - started) / 1000;
        const rate = (i + 1) / Math.max(elapsed, 0.001);
        console.log(`frame ${i + 1}/${jobs.length}  ${rate.toFixed(2)} fps  ${(elapsed).toFixed(1)}s`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
