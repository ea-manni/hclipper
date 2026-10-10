# hclipper Architecture Blueprint

This document specifies the technical design, process boundaries, and data flow of **hclipper**.

---

## 1. System Overview

hclipper follows a **Decoupled Desktop Architecture**:
- **Presentation Layer (Renderer Process)**: Modern React/TypeScript single-page application hosted inside an Electron shell.
- **Application Controller (Electron Main Process)**: Manages window lifecycle, native menus, file system dialogs, hardware access, and process IPC.
- **Media Engine (Local Python / Binary Service)**: Fast, headless worker handling video decoding, AI face tracking, transcription, and FFmpeg pipeline generation.

```
+-------------------------------------------------------------------------+
|                          hclipper Desktop App                           |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                  React UI (TypeScript + Tailwind)                 |  |
|  |  [URL Ingestion] [Waveform Scrubber] [Preview Canvas] [Publisher]  |  |
|  +-------------------------------------------------------------------+  |
|                                   |  Electron IPC Context Bridge        |
|  +-------------------------------------------------------------------+  |
|  |                       Electron Main Process                       |  |
|  |  (Window Manager, File Dialogs, Process Spawner, App Settings)    |  |
|  +-------------------------------------------------------------------+  |
|                                   |  Local IPC / JSON-RPC               |
|  +-------------------------------------------------------------------+  |
|  |                    hclipper Core Engine Service                    |  |
|  |                                                                   |  |
|  |  +--------------+  +--------------+  +--------------------------+ |  |
|  |  | yt-dlp       |  | FFmpeg DSP   |  | OpenCV YuNet Face Track  | |  |
|  |  | (Downloader) |  | (Audio/Video)|  | (Auto 9:16 Reframer)     | |  |
|  |  +--------------+  +--------------+  +--------------------------+ |  |
|  |  +-----------------------+  +-----------------------------------+ |  |
|  |  | faster-whisper        |  | Playwright Publisher              | |  |
|  |  | (Local Transcription) |  | (Multi-Platform Sessions)         | |  |
|  |  +-----------------------+  +-----------------------------------+ |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## 2. Core Subsystems

### 2.1 Media Ingestion (`engine/downloader.py`)
- Uses bundled `yt-dlp` executable.
- Supports:
  - YouTube (VODs, live stream recordings, shorts).
  - Facebook (Facebook Watch, church live streams).
  - Direct video URLs (HTTP/HTTPS MP4/HLS).
  - Local file drag-and-drop (`.mp4`, `.mov`, `.mkv`, `.webm`).
- Emits download progress events (`% downloaded`, speed, ETA) streamed to the UI progress bar.

### 2.2 Timeline & Speech Segmentation (`engine/trimmer.py`)
- Generates low-resolution audio waveform peak data for instant rendering in Wavesurfer.js.
- Implements two trimming modes:
  1. **Manual In/Out Cut**: Millisecond-accurate trimming using FFmpeg keyframe-aware stream copy or re-encode.
  2. **Cadence-Preserving Pause Trimmer**: Detects silence (`silencedetect=noise=-33dB:d=0.75s`) and contracts awkward pauses to a natural 0.35s breathing rhythm.

### 2.3 Audio & Video Mastering (`engine/audio_dsp.py`)
- **Vocal Chain**:
  - `highpass=f=80`: Cleans up low-frequency stage rumble and air conditioning hum.
  - `afftdn`: Fast FFT-based noise reduction for room echo and background hiss.
  - `acompressor`: Smooths vocal dynamics between soft speech and passionate preaching peaks.
  - `loudnorm=I=-14:LRA=7:TP=-1`: Enforces strict social media loudness standards (-14 LUFS).
- **Video Optimization**:
  - `hqdn3d` / unsharp mask for clarity.
  - Hardware encoding acceleration via Intel QSV (`h264_qsv`), NVIDIA NVENC (`h264_nvenc`), or AMD AMF with CPU fallback (`libx264`).

### 2.4 AI Smart Auto-Reframing (`engine/reframe.py`)
- Converts 16:9 horizontal stage footage to 9:16 vertical shorts.
- Uses `face_detection_yunet_2023mar.onnx` (lightweight, runs at 60+ FPS on CPU without GPU requirements).
- Calculates speaker bounding box and applies temporal moving-average smoothing to prevent jarring camera jitter when the speaker gestures.

### 2.5 Animated Subtitles & Visual Branding (`engine/subtitles.py`)
- Transcribes using `faster-whisper` (CTranslate2 backend) with word-level timestamps.
- Formats into Advanced SubStation Alpha (`.ass`) with:
  - Font: High-legibility sans-serif (`Segoe UI Black` / `Montserrat Black`).
  - Active word pop/scale animation and highlight color (e.g. gold/yellow).
  - Automatic 2-line wrapping within the TikTok/Instagram safe visual zone.
- Overlays top hook banner (frosted dark glass with gold text), brand social pills, and outro screen.

### 2.6 Social Publisher Engine (`engine/publisher/`)
- Persistent browser session storage in user profile directories.
- Multi-account isolation:
  - **YouTube Shorts**: Studio web automation / OAuth API.
  - **TikTok US**: Proxy/VPN-guarded profile with geolocation check.
  - **TikTok International/Nigeria**: Direct connection profile for high-engagement accounts.
  - **Instagram Reels**: Direct browser session with 2FA/device push approval.
- Central queue manager (`clips_queue.json`) tracking status per platform (`pending`, `posted`, `failed`).

---

## 3. Security, Privacy & Local-First Guarantees
- **No Telemetry / No Tracking**: Video files and audio data never leave the user's local machine.
- **Credentials Stored Locally**: Social session cookies and tokens are stored in the local app data folder and never transmitted to any third-party server.