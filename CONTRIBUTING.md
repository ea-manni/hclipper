# Contributing to hclipper

Thank you for your interest in contributing to **hclipper**! We welcome contributions from developers, church media volunteers, video editors, and designers.

---

## How You Can Contribute
1. **Bug Reports**: Submit detailed bug reports with operating system, input video specs, and error logs.
2. **Feature Requests**: Suggest new features (e.g. caption animations, platform integrations, export presets).
3. **Preset Design**: Create and share beautiful ASS subtitle styles, hook banner templates, or outro screen layouts.
4. **Code Contributions**: Improve performance, enhance UI components, or optimize FFmpeg encoding graphs.

---

## Development Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- FFmpeg (bundled in repo or installed on PATH)

### Quick Start
```bash
git clone https://github.com/your-username/hclipper.git
cd hclipper

# 1. Setup Python Engine
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# 2. Setup Electron Desktop UI
cd ui
npm install
npm run dev
```

---

## Pull Request Process
1. Fork the repo and create a branch from `master` (`feature/your-feature-name`).
2. Test your changes locally to ensure the full clipping pipeline works.
3. Submit a PR with a clear description and screenshots/GIFs demonstrating UI changes.