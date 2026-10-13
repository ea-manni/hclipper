/**
 * hclipper & Eyita Deterministic Motion Renderer
 * 
 * Drives headless Chromium via Playwright, steps through window.seek(t)
 * at N-subsamples per frame for physical optical motion blur, and pipes
 * raw frames directly into FFmpeg stdin.
 */

import { chromium } from "playwright";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    html: "./templates/kinetic_hook.html",
    output: "./output_motion.mov",
    fps: 60,
    subsample: 2,       // 2x or 4x sub-sampling for optical motion blur
    width: 1080,
    height: 1920,
    alpha: true,        // Output ProRes 4444 with alpha channel
    config: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--html") options.html = args[++i];
    else if (args[i] === "--output") options.output = args[++i];
    else if (args[i] === "--fps") options.fps = parseInt(args[++i], 10);
    else if (args[i] === "--subsample") options.subsample = parseInt(args[++i], 10);
    else if (args[i] === "--width") options.width = parseInt(args[++i], 10);
    else if (args[i] === "--height") options.height = parseInt(args[++i], 10);
    else if (args[i] === "--config") options.config = JSON.parse(args[++i]);
    else if (args[i] === "--no-alpha") options.alpha = false;
  }
  return options;
}

// Locate FFmpeg binary (prefer local bin/ffmpeg.exe if present)
function getFfmpegPath() {
  const localFfmpeg = path.resolve("../../bin/ffmpeg.exe");
  if (fs.existsSync(localFfmpeg)) return localFfmpeg;
  return "ffmpeg";
}

async function render() {
  const opts = parseArgs();
  const ffmpegBin = getFfmpegPath();
  const absHtml = path.resolve(opts.html);

  if (!fs.existsSync(absHtml)) {
    console.error(`Error: HTML template not found: ${absHtml}`);
    process.exit(1);
  }

  console.log(`[Motion Studio] Launching headless browser...`);
  const browser = await chromium.launch({
    executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : undefined,
    args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--font-render-hinting=none"]
  });

  const page = await browser.newPage({
    viewport: { width: opts.width, height: opts.height },
    deviceScaleFactor: 1
  });

  const fileUrl = "file:///" + absHtml.replace(/\\/g, "/");
  await page.goto(fileUrl, { waitUntil: "networkidle" });

  // Inject custom config if provided
  if (opts.config) {
    await page.evaluate((customConfig) => {
      window.CONFIG = { ...window.CONFIG, ...customConfig };
      if (window.CONFIG.duration) window.TOTAL_DURATION = window.CONFIG.duration;
      if (typeof window.initStage === "function") window.initStage();
      if (typeof window.seek === "function") window.seek(0);
    }, opts.config);
  }

  // Remove dev preview scrubber before render
  await page.evaluate(() => {
    const scrubber = document.getElementById("dev-scrubber");
    if (scrubber) scrubber.remove();
  });

  const duration = await page.evaluate(() => window.TOTAL_DURATION || 3.5);
  const totalSteps = Math.ceil(duration * opts.fps * opts.subsample);
  const dt = 1 / (opts.fps * opts.subsample);

  console.log(`[Motion Studio] Scene duration: ${duration}s | Target: ${opts.fps}fps | Subsampling: ${opts.subsample}x`);
  console.log(`[Motion Studio] Total discrete states: ${totalSteps} | Output: ${opts.output}`);

  // FFmpeg arguments
  const inputRate = opts.fps * opts.subsample;
  let ffmpegArgs = [
    "-y",
    "-f", "image2pipe",
    "-c:v", "png",
    "-r", `${inputRate}`,
    "-i", "-"
  ];

  if (opts.subsample > 1) {
    // Optical motion blur via tmix
    const weights = new Array(opts.subsample).fill(1).join(" ");
    ffmpegArgs.push(
      "-vf",
      `tmix=frames=${opts.subsample}:weights="${weights}",select='eq(mod(n\\,${opts.subsample})\\,${opts.subsample - 1})',setpts=N/${opts.fps}/TB`
    );
  }

  const isMov = opts.output.endsWith(".mov");
  if (opts.alpha && isMov) {
    // Broadcast ProRes 4444 with Alpha Channel
    ffmpegArgs.push(
      "-c:v", "prores_ks",
      "-profile:v", "4",
      "-pix_fmt", "yuva444p10le",
      opts.output
    );
  } else {
    // High-quality H.264
    ffmpegArgs.push(
      "-c:v", "libx264",
      "-crf", "15",
      "-preset", "medium",
      "-pix_fmt", "yuv420p",
      opts.output
    );
  }

  const ffmpeg = spawn(ffmpegBin, ffmpegArgs, { stdio: ["pipe", "inherit", "inherit"] });

  ffmpeg.on("error", (err) => {
    console.error(`FFmpeg spawn error:`, err);
  });

  const cues = opts.config?.cues || [];
  function isAnyCueActive(timeSec) {
    if (!cues || cues.length === 0) return true;
    for (const c of cues) {
      const s = Math.max(0, (c.start || 0) - 0.25);
      const e = (c.start || 0) + (c.duration || 3.8) + 0.35;
      if (timeSec >= s && timeSec <= e) return true;
    }
    return false;
  }

  let blankBuffer = null;

  for (let i = 0; i < totalSteps; i++) {
    const t = i * dt;
    const active = isAnyCueActive(t);

    let pngBuffer;
    if (active) {
      await page.evaluate((time) => window.seek(time), t);
      pngBuffer = await page.screenshot({
        type: "png",
        omitBackground: true
      });
    } else {
      if (!blankBuffer) {
        await page.evaluate(() => {
          if (typeof window.seek === "function") window.seek(9999);
        });
        blankBuffer = await page.screenshot({
          type: "png",
          omitBackground: true
        });
      }
      pngBuffer = blankBuffer;
    }

    ffmpeg.stdin.write(pngBuffer);

    // Emit progress event every 10 frames or at key intervals
    if (i % 10 === 0 || i === totalSteps - 1) {
      const sec = (i * dt).toFixed(1);
      const pct = Math.min(85, Math.max(5, Math.round((i / totalSteps) * 85)));
      console.log(`__HCLIPPER_JSON__${JSON.stringify({
        event: "motion_progress",
        phase: "canvas",
        frame: i,
        total_frames: totalSteps,
        percent: pct,
        sec: Number(sec),
        total_sec: Number(duration.toFixed(1)),
        detail: `Rendering motion canvas frame ${i + 1}/${totalSteps} (${sec}s / ${duration.toFixed(1)}s)...`
      })}`);
    }
  }

  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });

  await browser.close();
  console.log(`[Motion Studio] Render successfully completed! -> ${opts.output}`);
}

render().catch((err) => {
  console.error(`[Motion Studio] Fatal error during render:`, err);
  process.exit(1);
});
