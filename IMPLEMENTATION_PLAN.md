# hclipper Implementation Plan & Roadmap

This document outlines the step-by-step phased execution plan to develop, stabilize, package, and release **hclipper** as an open-source project.

---

## Phase 1: Engine Modularization & CLI Hardening (Foundation)
**Objective**: Refactor the proven production scripts from `niyiadekunle` into clean, reusable Python modules with standardized JSON input/output contracts.

- [x] **Task 1.1**: Initialize project structure in `C:\Users\Ebunoluwa\Desktop\hclipper`:
  - `engine/`: Core Python pipeline packages.
  - `ui/`: Electron + React application.
  - `assets/`: Default fonts, banners, brand pills, and audio beds.
  - `bin/`: Platform binaries (`ffmpeg`, `ffprobe`, `yt-dlp`).
- [x] **Task 1.2**: Build `engine/downloader.py` (Unified YouTube + Facebook + Direct URL ingestion via `yt-dlp`).
- [x] **Task 1.3**: Build `engine/audio_dsp.py` (Broadcast loudnorm, vocal EQ, noise suppression, music ducking).
- [x] **Task 1.4**: Build `engine/trimmer.py` (Waveform data generation + pause trimming).
- [x] **Task 1.5**: Build `engine/reframe.py` (YuNet ONNX face tracking and 9:16 crop window calculator).
- [x] **Task 1.6**: Build `engine/subtitles.py` (Faster-Whisper word-level transcription + ASS generator).
- [x] **Task 1.7**: Build `engine/publisher.py` (Multi-account publisher for YouTube, TikTok US/NG, and Instagram).
- [x] **Task 1.8**: Create unified CLI entry point (`python -m engine.cli`) to test the modularized pipeline end-to-end.

---

## Phase 2: Desktop GUI Scaffolding & Visual Studio Layout
**Objective**: Build the modern, responsive Electron + React interface.

- [ ] **Task 2.1**: Initialize Electron + Vite + React + TypeScript + Tailwind CSS project in `ui/`.
- [ ] **Task 2.2**: Implement Studio Dark Theme with glassmorphism, accent colors, and responsive layout.
- [ ] **Task 2.3**: Build **Source Ingestion Screen**:
  - URL input box with platform auto-detection (YouTube / Facebook).
  - Drag-and-drop local file dropzone.
  - Real-time download progress bar.
- [ ] **Task 2.4**: Build **Timeline & Waveform Scrubber**:
  - Integrate Wavesurfer.js for smooth audio waveform navigation.
  - Draggable start/end in-out markers with millisecond timestamp inputs.
  - Video playback preview with play/pause, scrub, and loop shortcuts.
- [ ] **Task 2.5**: Build **Clip Inspector & Style Customizer**:
  - Top hook banner editor (headline text, font size, banner style).
  - Aspect ratio toggle: 9:16 Vertical, 1:1 Square, 16:9 Landscape.
  - Face tracking enable/disable switch.
  - Subtitle styling selector (TikTok Bounce, Clean White, Gold Outline).
  - Background music selector with volume slider.

---

## Phase 3: Electron-to-Engine IPC Integration
**Objective**: Wire the React frontend to the Python engine.

- [ ] **Task 3.1**: Establish secure Electron IPC bridge (`preload.ts` + `ipcRenderer` / `ipcMain`).
- [ ] **Task 3.2**: Implement background job runner with live progress streaming (downloading %, reframing %, rendering %, publishing %).
- [ ] **Task 3.3**: Implement interactive 9:16 crop preview before full rendering.
- [ ] **Task 3.4**: Implement multi-clip queue table with retry, preview, and status badges.

---

## Phase 4: Social Accounts & Multi-Platform Publisher GUI
**Objective**: Provide a visual account manager and publishing workflow.

- [ ] **Task 4.1**: Build **Accounts Management Modal**:
  - "Connect Instagram" button (launches interactive approval window).
  - "Connect TikTok US" button (launches proxy-guarded login).
  - "Connect TikTok Nigeria" button (launches direct local login).
  - "Connect YouTube Shorts" button (OAuth / Studio browser session).
- [ ] **Task 4.2**: Build **One-Click Publish & Schedule Screen**:
  - Platform checkboxes per clip.
  - Batch publish action (e.g. Publish Clips 1-6 to IG and TikTok NG).
  - Live log drawer displaying upload progress.

---

## Phase 5: Standalone Windows Packaging (`.exe`)
**Objective**: Produce a zero-prerequisite installer that anyone can download and run.

- [ ] **Task 5.1**: Bundle pre-compiled `ffmpeg.exe`, `ffprobe.exe`, and `yt-dlp.exe` in `resources/bin/`.
- [ ] **Task 5.2**: Package standalone embedded Python environment using PyInstaller or embedded Python distribution.
- [ ] **Task 5.3**: Configure `electron-builder` to generate `hclipper-Setup-v1.0.0.exe` and portable `.exe`.
- [ ] **Task 5.4**: Test installation and full pipeline execution on a clean Windows machine without Node or Python pre-installed.

---

## Phase 6: Open-Source Launch & Community Readiness
**Objective**: Prepare the repository for public release on GitHub.

- [ ] **Task 6.1**: Finalize `README.md` with demo animated GIFs and screenshots.
- [ ] **Task 6.2**: Add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and issue templates.
- [ ] **Task 6.3**: Publish initial GitHub release tag `v1.0.0` with downloadable Windows `.exe` installer.
- [ ] **Task 6.4**: Write outreach guide / pitch for church networks and creator communities.