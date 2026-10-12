# hclipper — Implementation Status & Feature Roadmap

This document tracks completed features, resolved architecture gaps, and ongoing enhancements for hclipper.

---

## 1. Storage & Output Path Management ✅ (Completed)

### 1.1 User-Configurable Download & Export Directory
* **Status**: **Fully Implemented & Verified**
* **Delivered Features**:
  - [x] Default storage configured to `%USERPROFILE%\Videos\hclipper\downloads` and `%USERPROFILE%\Videos\hclipper\clips` (with fallback to local directory).
  - [x] Interactive **Settings / Storage Preferences** modal added to application Header.
  - [x] Native OS folder pickers (`ipcMain.handle('hclipper:select-directory')`) for custom downloads and clips destination paths.
  - [x] Persistent JSON settings management in Electron `userData/settings.json`.
  - [x] Quick-action folder buttons:
    - "📂 Open Downloads Folder" directly on Step 1 (Ingest View).
    - "📂 Open Clips Folder" directly on the application Header and Step 6 (Publisher View).

---

## 2. Multi-Clip Generation & AI Highlight Discovery ✅ (Completed)

### 2.1 6-Step Creator Studio Workflow Split
* **Status**: **Fully Implemented & Verified**
* **Workflow Architecture**:
  1. **Step 1: Video Ingest** — Online stream download (YouTube / Facebook via yt-dlp) or local file browse.
  2. **Step 2: AI Clip Scout & Multi-Splitter** — Dedicated view to extract **3, 5, 8, 10, or custom number of short clips** from 50+ min long-form sermons/podcasts.
  3. **Step 3: Timeline & Audio Clarity** — Visual audio waveform scrubber with dual beginner/pro audio engineering controls.
  4. **Step 4: AI Auto-Reframe** — Dedicated YuNet ONNX face tracker, 9:16 vertical crop preview, and deadzone camera panning.
  5. **Step 5: Captions & Viral Hooks** — Per-clip customized hook headlines, ASS subtitle styling, and social watermark pills.
  6. **Step 6: Social Publisher & Queue** — Verified queue with zero placeholders, interactive video player modal, and multi-account publishing.

### 2.2 Step-by-Step API Key Setup Guide (100% Free Gemini Key)
* **Status**: **Fully Implemented & Verified**
* **Delivered Features**:
  - [x] Built-in modal and inline guide explaining how to obtain a 100% free Google Gemini 2.5 Flash API key (1,500 free requests daily, no credit card required).
  - [x] Direct one-click link to Google AI Studio (`aistudio.google.com/app/apikey`).
  - [x] Support for DeepSeek, OpenAI, Anthropic Claude, and **100% Offline Local Engine** (zero API key needed).

### 2.3 Waveform Player Zero-Black-Screen & Audio Terminology Clarity
* **Status**: **Fully Implemented & Verified**
* **Delivered Features**:
  - [x] Fixed blank waveform container by implementing instant procedural speech energy peak bars and `file:///` URI conversion.
  - [x] Dual beginner-friendly and audio-engineering labels:
    - **✂️ Auto-Cut Pauses & Dead Air** (*Cadence-Aware Silence Trimmer*): Cuts dead air while preserving natural 0.34s breathing rhythm.
    - **🎙️ Vocal Clarity & Room Denoise** (*80Hz Highpass & FFT Noise Gate*): Removes AC hum and room echo.
    - **🔊 Social Media Phone Volume Boost** (*EBU R128 Loudnorm -14 LUFS*): Ensures speech is loud and clear on mobile phones without clipping.
    - **🎵 Background Music Bed & Ducking** (*Dynamic Sidechain Ducking*): Blends background music that dips when the speaker talks.

---

## 3. High-Speed Targeted Clip Rendering & Zero Placeholders ✅ (Completed)

### 3.1 Targeted Clip Rendering via Hardware Encoder
* **Status**: **Fully Implemented & Verified**
* **Delivered Features**:
  - [x] Updated `engine/reframe.py` and `engine/cli.py` with `--start` and `--end` timestamp parameters.
  - [x] Fixed subprocess pipe buffer deadlock by consuming/redirecting stderr.
  - [x] Intel QSV hardware encoding (`h264_qsv`) renders 30–45s vertical short clips in **~5–15 seconds** (rather than hours for entire 52-minute files).
  - [x] Single-clip GPU rendering and Batch Render Queue in UI.

### 3.2 Social Publisher Zero Placeholders & Real Video Player
* **Status**: **Fully Implemented & Verified**
* **Delivered Features**:
  - [x] Removed all mock ghost files from `clips_queue.json`.
  - [x] Real rendered clips (`Clip1_Discover_Calling.mp4`, `Clip2_Comparison_Trap.mp4`, `Clip3_Power_Of_Habits.mp4`) populated in queue.
  - [x] Interactive **In-App Video Player Modal** launched upon clicking "Play" with full sound and playback controls.
  - [x] Quick actions to reveal file in Windows Explorer or open in OS default video player.

---

## 4. Project-Centric Architecture & Holistic Publisher ✅ (Completed)

### 4.1 Project-Based Studio Workspaces (Embedded Steps 1–5)
* **Status**: **Fully Implemented & Verified**
* **Delivered Features**:
  - [x] Re-architected hclipper from scattered global state into distinct **Projects** (`projects.json` + Electron IPC + local persistence).
  - [x] Each project embeds its own independent state for:
    - **Step 1: Video Ingest** (source video / stream URL)
    - **Step 2: AI Clip Scout** (scouted viral moments and scores)
    - **Step 3: Timeline & Audio** (audio DSP, cadence cuts, EQ)
    - **Step 4: AI Auto-Reframe** (aspect ratio, face tracking, rendered clips)
    - **Step 5: Captions & Hooks** (custom hook headlines, subtitle presets)
  - [x] **Project Switcher Dropdown** in Header: 1-click switching, project stats, and "+ New Project" shortcut.
  - [x] **Projects Manager Modal** (`ProjectModal.tsx`): visual project cards, create new project with local file / YouTube URL, duplicate project, and delete project.
  - [x] **Sidebar Reorganization**:
    - **Active Project Scope** banner displaying current project and rendered clip stats.
    - **Embedded Project Workflow** (Steps 1–5).
    - **Cross-Project Hub** (Step 6 + Projects Manager).

### 4.2 Holistic Cross-Project Social Publisher (Step 6)
* **Status**: **Fully Implemented & Verified**
* **Delivered Features**:
  - [x] Step 6 acts as a unified master control center aggregating rendered master clips from **all projects**.
  - [x] **Project Filter Pills**: Filter view by "All Projects" or by specific project with real-time clip count badges.
  - [x] **Project Badges on Queue Items**: Every clip clearly displays its source project name.
  - [x] **Two-Way Studio Jump**: Direct "Open in Studio" button from each clip in the holistic publisher back into that project's Step 4/5 for instant editing.
  - [x] **Auto-Queue Registration**: Newly reframed clips in Step 4 automatically register into the holistic queue with `projectId` and `projectName`.

---

## 5. Phase 4 Extended Roadmap (Future Sprints)

### 5.1 Whisper Audio Transcription Integration with Highlight Scout
- [ ] Automatically run Faster-Whisper to generate an in-memory timestamped transcript immediately upon stream download / local import for videos without closed captions.

### 5.2 Multi-Speaker Split Screen (Podcast / Interview Mode)
- [ ] Detect when two distinct human subjects are speaking concurrently.
- [ ] Generate stacked 9:16 layout (top speaker + bottom speaker) with dynamic border separation.

### 5.3 YouTube / TikTok Browser Cookie Importer
- [ ] Add option to import `cookies.txt` directly to bypass bot detection challenges on restricted corporate or church networks.
