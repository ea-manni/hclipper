"""
hclipper Ingestion & Downloader Subsystem
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Unified media ingestion for YouTube, Facebook, direct video URLs, and local files
using yt-dlp with hardware-friendly post-processing and real-time progress callbacks.
"""

import os
import sys
import json
import time
import shutil
import re
from pathlib import Path
from typing import Optional, Callable, Dict, Any

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

from engine import PROJECT_ROOT

class MediaDownloader:
    """
    Handles media extraction and download from online platforms
    (YouTube, Facebook, Vimeo, direct HTTP streams) or local imports.
    """

    def __init__(self, download_dir: Optional[str] = None):
        self.download_dir = Path(download_dir) if download_dir else PROJECT_ROOT / "downloads"
        self.download_dir.mkdir(parents=True, exist_ok=True)

    def extract_info(self, url: str) -> Dict[str, Any]:
        """
        Extract video metadata without downloading.
        Returns a dictionary with title, duration, thumbnail, channel, and formats.
        """
        # If it is a local file path
        local_path = Path(url)
        if local_path.is_file():
            return {
                "id": local_path.stem,
                "title": local_path.stem,
                "duration": None,
                "uploader": "Local File",
                "thumbnail": None,
                "is_local": True,
                "local_path": str(local_path.resolve())
            }

    def _get_base_ydl_opts(self) -> Dict[str, Any]:
        """Configures JavaScript runtime and client fallbacks to bypass YouTube bot detection."""
        opts: Dict[str, Any] = {
            "extractor_args": {
                "youtube": {
                    "player_client": ["web", "mweb", "android", "ios"]
                }
            }
        }
        node_exe = shutil.which("node") or (r"C:\Program Files\nodejs\node.exe" if os.path.exists(r"C:\Program Files\nodejs\node.exe") else None)
        if node_exe:
            opts["js_runtimes"] = {"node": {}}
        return opts

    def extract_info(self, url: str) -> Dict[str, Any]:
        """
        Extract video metadata without downloading.
        Returns a dictionary with title, duration, thumbnail, channel, and formats.
        """
        # If it is a local file path
        local_path = Path(url)
        if local_path.is_file():
            return {
                "id": local_path.stem,
                "title": local_path.stem,
                "duration": None,
                "uploader": "Local File",
                "thumbnail": None,
                "is_local": True,
                "local_path": str(local_path.resolve())
            }

        if not yt_dlp:
            raise RuntimeError("yt-dlp is not installed in the Python environment.")

        ydl_opts = {
            **self._get_base_ydl_opts(),
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "extract_flat": False,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
        except Exception as e:
            err_msg = str(e).lower()
            if "bot" in err_msg or "sign in" in err_msg or "429" in err_msg:
                # Fall back to mobile player client
                ydl_opts["extractor_args"] = {"youtube": {"player_client": ["android", "ios"]}}
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
            else:
                raise e

        return {
            "id": info.get("id", ""),
            "title": info.get("title", "Untitled Video"),
            "duration": info.get("duration", 0),
            "uploader": info.get("uploader", info.get("channel", "Unknown Channel")),
            "thumbnail": info.get("thumbnail", ""),
            "is_local": False,
            "webpage_url": info.get("webpage_url", url),
            "description": info.get("description", "")
        }

    def download(
        self,
        url: str,
        output_name: Optional[str] = None,
        download_subs: bool = True,
        max_height: int = 1080,
        cookies_from_browser: Optional[str] = None,
        cookiefile: Optional[str] = None,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """
        Download media file from URL or copy/symlink local file.
        Tracks live download progress via progress_callback.
        """
        local_path = Path(url)
        if local_path.is_file():
            target_path = self.download_dir / (output_name if output_name else local_path.name)
            if not target_path.exists() or target_path.resolve() != local_path.resolve():
                shutil.copy2(local_path, target_path)
            if progress_callback:
                progress_callback({"status": "finished", "percent": 100.0, "file_path": str(target_path)})
            return {
                "title": local_path.stem,
                "video_path": str(target_path.resolve()),
                "subtitle_path": None,
                "is_local": True
            }

        # Check for already-downloaded local cache
        vid_m = re.search(r'(?:v=|/|youtu\.be/)([a-zA-Z0-9_-]{11})', url)
        if vid_m:
            vid_id = vid_m.group(1)
            cached_files = list(self.download_dir.glob(f"*{vid_id}*.mp4")) + list(self.download_dir.glob(f"*{vid_id}*.mkv"))
            for cand in cached_files:
                if cand.exists() and cand.stat().st_size > 1024 * 1024:
                    base = str(cand).rsplit('.', 1)[0]
                    sub_file = None
                    for ext in [".en.vtt", ".vtt", ".en.srt", ".srt"]:
                        if os.path.exists(f"{base}{ext}"):
                            sub_file = f"{base}{ext}"
                            break
                    print(f"[ingest] Detected already-downloaded video in local storage: {cand.name}", flush=True)
                    if progress_callback:
                        progress_callback({"status": "completed", "percent": 100.0, "file_path": str(cand.resolve())})
                    return {
                        "title": cand.stem,
                        "duration": None,
                        "video_path": str(cand.resolve()),
                        "subtitle_path": str(Path(sub_file).resolve()) if sub_file else None,
                        "thumbnail": "",
                        "channel": ""
                    }

        if not yt_dlp:
            raise RuntimeError("yt-dlp is not installed in the Python environment.")

        out_template = str(self.download_dir / (f"{output_name}.%(ext)s" if output_name else "%(title)s [%(id)s].%(ext)s"))

        def yt_hook(d):
            status = d.get("status")
            if status == "downloading":
                total_bytes = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
                downloaded = d.get("downloaded_bytes", 0)
                percent = (downloaded / total_bytes * 100.0) if total_bytes > 0 else 0.0
                speed = d.get("speed")
                eta = d.get("eta")

                # Format human readable speed & eta
                speed_str = f"{speed / (1024 * 1024):.1f} MB/s" if speed else "N/A"
                eta_str = f"{int(eta)}s" if eta else "calculating"
                dl_mb = downloaded / (1024 * 1024)
                total_mb = total_bytes / (1024 * 1024) if total_bytes > 0 else 0

                # Print human-readable progress line for stdout/electron log streaming
                print(f"[download] {percent:.1f}% of {total_mb:.1f} MB at {speed_str} (ETA {eta_str})", flush=True)

                if progress_callback:
                    progress_callback({
                        "status": "downloading",
                        "percent": round(percent, 1),
                        "downloaded_bytes": downloaded,
                        "total_bytes": total_bytes,
                        "speed_bps": speed,
                        "speed_str": speed_str,
                        "eta_seconds": eta,
                        "eta_str": eta_str,
                        "filename": d.get("filename")
                    })
            elif status == "finished":
                print("[download] Stream chunk finished. Post-processing media...", flush=True)
                if progress_callback:
                    progress_callback({
                        "status": "processing",
                        "percent": 95.0,
                        "filename": d.get("filename")
                    })

        ydl_opts: Dict[str, Any] = {
            **self._get_base_ydl_opts(),
            "format": f"bestvideo[height<={max_height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={max_height}]+bestaudio/best[height<={max_height}]/best",
            "outtmpl": out_template,
            "merge_output_format": "mp4",
            "progress_hooks": [yt_hook],
            "quiet": False,
            "no_warnings": False,
        }

        if cookies_from_browser:
            ydl_opts["cookiesfrombrowser"] = (cookies_from_browser,)
        if cookiefile:
            ydl_opts["cookiefile"] = cookiefile

        if download_subs:
            ydl_opts["writeautomaticsub"] = True
            ydl_opts["writesubtitles"] = True
            ydl_opts["subtitleslangs"] = ["en", "en-US", "en-GB", "en.*"]
            ydl_opts["subtitlesformat"] = "vtt/srt/best"

        print(f"[ingest] Connecting to stream URL: {url}", flush=True)
        info = None
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
        except Exception as e:
            err_msg = str(e).lower()
            if "bot" in err_msg or "sign in" in err_msg or "429" in err_msg or "too many requests" in err_msg:
                print(f"[ingest] YouTube anti-bot/rate-limit detected ({e}). Retrying with mobile player API fallback...", flush=True)
                ydl_opts["extractor_args"] = {"youtube": {"player_client": ["android", "ios"]}}
                if download_subs and ("subtitles" in err_msg or "429" in err_msg):
                    ydl_opts.pop("writeautomaticsub", None)
                    ydl_opts.pop("writesubtitles", None)
                    ydl_opts.pop("subtitleslangs", None)
                    ydl_opts.pop("subtitlesformat", None)
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
            elif download_subs and ("429" in err_msg or "subtitles" in err_msg or "too many requests" in err_msg):
                print(f"[ingest] YouTube subtitle endpoint rate-limited (HTTP 429). Retrying video-only download stream...", flush=True)
                ydl_opts.pop("writeautomaticsub", None)
                ydl_opts.pop("writesubtitles", None)
                ydl_opts.pop("subtitleslangs", None)
                ydl_opts.pop("subtitlesformat", None)
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
            else:
                raise e

        merged_filename = ydl.prepare_filename(info)
        base, _ = os.path.splitext(merged_filename)
        mp4_file = f"{base}.mp4"
        if not os.path.exists(mp4_file) and os.path.exists(merged_filename):
            mp4_file = merged_filename

        # Find downloaded subtitles if any
        sub_file = None
        for ext in [".en.vtt", ".vtt", ".en.srt", ".srt"]:
            candidate = f"{base}{ext}"
            if os.path.exists(candidate):
                sub_file = candidate
                break

        result = {
            "title": info.get("title", ""),
            "duration": info.get("duration", 0),
            "video_path": str(Path(mp4_file).resolve()),
            "subtitle_path": str(Path(sub_file).resolve()) if sub_file else None,
            "thumbnail": info.get("thumbnail", ""),
            "channel": info.get("uploader", "")
        }

        if progress_callback:
            progress_callback({"status": "completed", "percent": 100.0, "file_path": result["video_path"]})

        print(f"[ingest] Download completed successfully: {result['video_path']}", flush=True)
        return result
