# HANDOVER BRIEF: hclipper Project (Desktop App & Open-Source Release)

## 1. Project Identity & Mission
- **Project Name**: `hclipper`
- **Location**: `C:\Users\Ebunoluwa\Desktop\hclipper`
- **Git Status**: Initialized repository on `master` branch with initial commit.
- **Mission**: A 100% free, local-first, standalone desktop application (`.exe`) that empowers content creators, podcasters, educators, and church media teams to turn long-form videos into high-impact vertical (9:16) clips for TikTok, Instagram Reels, and YouTube Shorts.
- **Core Value Proposition**: Zero cloud costs, zero subscriptions, no watermarks, local AI privacy, and single-click multi-account publishing. Intended as a major open-source contribution on GitHub.

---

## 2. Agreed Technology Stack
- **Desktop Shell**: **Electron** (for native Windows packaging into `.exe` via `electron-builder`).
- **Frontend UI**: **React + TypeScript + Tailwind CSS** (modern dark studio theme, glassmorphism, responsive canvas).
- **Waveform & Timeline**: **Wavesurfer.js** (interactive waveform scrubbing, in/out range markers, millisecond inputs).
- **Media Engine**: **FFmpeg** (hardware-accelerated QSV/NVENC/CPU) + **yt-dlp** (stream downloader for YouTube, Facebook, and direct links).
- **AI Face-Tracking**: **OpenCV + YuNet ONNX** (`face_detection_yunet_2023mar.onnx`) for smooth 9:16 vertical subject-centered reframing.
- **Subtitles**: **faster-whisper** (local CTranslate2) or **whisper.cpp** generating word-level karaoke animated ASS captions.
- **Publisher**: **Playwright Persistent Sessions** for automated publishing to:
  1. YouTube Shorts (YouTube Studio / OAuth API)
  2. TikTok US Account (proxy/VPN guarded)
  3. TikTok Nigeria/International Account (direct local connection for 30k+ accounts)
  4. Instagram Reels (persistent session with 2FA device approval)

---

## 3. Reference Implementation (Source Code in `niyiadekunle`)
All the core clipping, DSP, and publishing algorithms were built and tested in `C:\Users\Ebunoluwa\Desktop\niyiadekunle`. Key reference files:
- `pipeline/sermon_clip_maker.py`: Core pipeline orchestration (ingestion, silence trimming, overlays, ducking).
- `pipeline/batch_update_all_masters.py`: Batch subtitle alignment, hook banner rendering, and FFmpeg filter graphs.
- `pipeline/moderate_pause_trimmer.py`: Cadence-preserving silence detector (`noise=-33dB:d=0.75s`, preserving 0.35s breathing rhythm).
- `pipeline/smart_auto_reframe.py`: Face detection and bounding box temporal smoothing for 9:16 vertical crop.
- `pipeline/face_detection_yunet_2023mar.onnx`: Fast, lightweight CPU-compatible ONNX face tracking model.
- `pipeline/publisher/platforms/tiktok.py`: Dual-account TikTok publisher (`account='us'` vs `account='ng'`).
- `pipeline/publisher/platforms/youtube.py`: YouTube Shorts uploader via browser session & OAuth fallback.
- `pipeline/publisher/platforms/instagram.py`: Instagram Reels publisher via browser session & instagrapi.
- `pipeline/publisher/queue_manager.py`: Centralized queue tracking status across `IG`, `TT-US`, `TT-NG`, and `YT`.
- `pipeline/publisher/social_queue_runner.py`: CLI queue runner supporting range publishing (e.g. `--publish 1-6`).

---

## 4. Current State of `hclipper`
The following documentation files have already been committed in `hclipper`:
- `README.md`: Public-facing project overview, features, and quickstart.
- `ARCHITECTURE.md`: Deep system specification, process boundaries, and IPC diagram.
- `IMPLEMENTATION_PLAN.md`: Phased roadmap from Phase 1 through Phase 6.
- `CONTRIBUTING.md`: Contributor guide and pull request rules.
- `.gitignore`: Standard Node, Electron, Python, and media ignore patterns.

---

## 5. Immediate Next Step for the New Session
**Execute Phase 1: Engine Modularization**:
1. Create the `engine/` package directory inside `hclipper`.
2. Port and modularize the reference logic into clean, testable Python classes:
   - `engine/downloader.py` (Unified yt-dlp downloader with progress callback)
   - `engine/trimmer.py` (Waveform generator + cadence silence trimmer)
   - `engine/audio_dsp.py` (Loudnorm -14 LUFS, vocal EQ, afftdn denoiser, audio ducking)
   - `engine/reframe.py` (YuNet ONNX face tracking with trajectory smoothing)
   - `engine/subtitles.py` (Faster-Whisper transcription + stylized ASS generator)
   - `engine/publisher.py` (Unified social publisher with multi-account support)
   - `engine/cli.py` (CLI entry point for running the pipeline headless)
3. Copy necessary static assets (YuNet ONNX model, Segoe UI Black font definitions, default banners) into `hclipper/assets/`.
4. Scaffold the Electron + React UI project in `hclipper/ui/`.