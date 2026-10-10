# hclipper 🎬
### Free, Local-First Desktop Video Clipper, Auto-Reframer & Social Publisher

**hclipper** is a 100% free, open-source desktop application that empowers everyday content creators, church media teams, podcasters, and educators to turn long-form videos into high-impact, vertical (9:16) clips tailored for **TikTok**, **Instagram Reels**, and **YouTube Shorts**.

---

## 🌟 Why hclipper?

Most creators and churches face two bad choices:
1. **Expensive SaaS Tools** (Opus Clip, Vidyo.ai, Descript) with restrictive monthly minutes, watermarks, and recurring subscription costs.
2. **Complex NLE Suites** (Premiere Pro, DaVinci Resolve) that require steep learning curves and hours of manual work.

**hclipper** bridges the gap: a zero-cost, local-first desktop application with a clean, friendly graphical interface. Everything runs on your machine—no cloud bills, no privacy leaks, no monthly caps.

---

## ✨ Key Features

- 📥 **Multi-Platform Ingestion**: Paste a YouTube or Facebook Live link, or drag-and-drop local MP4/MOV/MKV video files.
- ✂️ **Visual Waveform Trimming**: Scrub through long sermons or podcasts, preview audio waveforms, and cut precise highlight moments.
- 🔇 **Cadence-Aware Silence Trimming**: Eliminate awkward dead air while preserving natural human breathing pauses.
- 🎙️ **Studio Audio & Video Mastering**: Vocal enhancement, room echo/noise suppression, and broadcast loudness normalization (-14 LUFS).
- 🎯 **AI 9:16 Smart Auto-Reframing**: Lightweight on-device face tracking (YuNet / OpenCV) keeps speakers centered when converting 16:9 landscape to 9:16 vertical.
- 💬 **Dynamic Karaoke Subtitles**: Word-level animated captions (TikTok style, Segoe UI Black, gold gradients) with high contrast.
- 🎨 **Branding & Social Pills**: Customizable top hook banners, animated handle pills (TikTok, IG, YT), background ambient music ducking, and branded outro screens.
- 🚀 **Multi-Account Social Publisher**: One-click direct publishing to YouTube Shorts, TikTok (US & International accounts), and Instagram Reels.
- 💻 **Standalone Executable (.exe)**: Bundled with embedded FFmpeg and local AI models—no complex Python or terminal setup required.

---

## 🛠️ Technology Architecture

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Desktop Shell** | Electron | Cross-platform desktop window & native OS integration |
| **Frontend UI** | React + TypeScript + Tailwind CSS | Modern studio GUI with timeline scrubber & live preview |
| **Waveform Engine** | Wavesurfer.js | Real-time audio waveform visualizer and range selector |
| **Media Processing** | FFmpeg (Hardware-accelerated) | Trimming, audio DSP, video filtering, complex composition |
| **Stream Downloader**| yt-dlp | High-speed ingestion from YouTube, Facebook, and 1000+ sites |
| **Face Tracking** | OpenCV + YuNet ONNX | Smooth speaker tracking for 9:16 vertical crop |
| **Captions AI** | faster-whisper / whisper.cpp | High-accuracy local speech-to-text without cloud API keys |
| **Social Automation**| Playwright Persistent Sessions | Direct publishing with account & proxy isolation |
| **Distribution** | electron-builder | Standalone single-file Windows installer (`.exe`) |

---

## 📖 Documentation
- [Architecture Blueprint](ARCHITECTURE.md) - Deep dive into system design and process flows.
- [Implementation Plan](IMPLEMENTATION_PLAN.md) - Phased roadmap from CLI to open-source v1.0.0 release.
- [Contributing Guide](CONTRIBUTING.md) - How to contribute code, report bugs, or submit templates.

---

## ⚖️ License
Distributed under the **MIT License**. Free for personal, commercial, and ministry use.