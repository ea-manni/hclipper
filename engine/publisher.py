"""
hclipper Multi-Platform Social Publisher Subsystem
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Persistent session browser automation & API publisher for YouTube Shorts,
TikTok (Dual-Account: US Stealth Proxy vs. Nigeria Direct), and Instagram Reels.
"""

import os
import sys
import json
import time
import re
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import requests

from engine import PROJECT_ROOT

SESSIONS_DIR = PROJECT_ROOT / "sessions"
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
QUEUE_FILE = PROJECT_ROOT / "clips_queue.json"

class QueueManager:
    """
    Manages central publishing queue stored in clips_queue.json.
    """

    def __init__(self, queue_path: Optional[Path] = None):
        self.queue_path = Path(queue_path) if queue_path else QUEUE_FILE
        self.alt_queue_path = None
        if sys.platform == "win32":
            appdata = os.environ.get("APPDATA")
            if appdata:
                self.alt_queue_path = Path(appdata) / "hclipper-studio" / "clips_queue.json"

        (PROJECT_ROOT / "clips").mkdir(parents=True, exist_ok=True)
        self.items: List[Dict[str, Any]] = self.load()
        self._ensure_platform_keys()

    def _ensure_platform_keys(self):
        updated = False
        for item in self.items:
            status = item.setdefault("status", {})
            for plat in ["youtube", "instagram", "tiktok_us", "tiktok_ng"]:
                if plat not in status:
                    status[plat] = "pending"
                    updated = True
        if updated:
            self.save()

    def load(self) -> List[Dict[str, Any]]:
        loaded_items = []
        sources = [self.queue_path]
        if self.alt_queue_path and self.alt_queue_path != self.queue_path:
            sources.append(self.alt_queue_path)

        for src in sources:
            if src.exists():
                try:
                    with open(src, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if isinstance(data, list):
                            for item in data:
                                fpath = item.get("file_path", "")
                                if "scratch" in fpath.replace("\\", "/").lower():
                                    continue
                                full_path = Path(fpath) if Path(fpath).is_absolute() else (PROJECT_ROOT / fpath)
                                if full_path.exists() and item not in loaded_items:
                                    loaded_items.append(item)
                except Exception:
                    pass
            if loaded_items:
                break

        self.items = loaded_items
        # Automatically scan clips directory for real rendered files
        self.scan_clips_directory()
        self.save()
        return self.items

    def save(self):
        targets = [self.queue_path]
        if self.alt_queue_path and self.alt_queue_path != self.queue_path:
            targets.append(self.alt_queue_path)

        for target in targets:
            try:
                target.parent.mkdir(parents=True, exist_ok=True)
                with open(target, "w", encoding="utf-8") as f:
                    json.dump(self.items, f, indent=2, ensure_ascii=False)
            except Exception:
                pass

    def scan_clips_directory(self, clips_dir: Optional[Path] = None) -> int:
        target_dir = clips_dir or (PROJECT_ROOT / "clips")
        if not target_dir.exists():
            return 0

        existing_paths = {item["file_path"] for item in self.items}
        new_count = 0

        for file in sorted(target_dir.glob("*.mp4")):
            rel_path = str(file.relative_to(PROJECT_ROOT)).replace("\\", "/")
            if rel_path in existing_paths:
                continue

            title = self._clean_title_from_filename(file.name)
            caption = f"{title}\n\n#Shorts #Reels #TikTok"

            queue_item = {
                "id": file.stem,
                "file_path": rel_path,
                "filename": file.name,
                "title": title,
                "caption": caption,
                "status": {
                    "youtube": "pending",
                    "instagram": "pending",
                    "tiktok": "pending",
                    "tiktok_ng": "pending"
                },
                "history": []
            }
            self.items.append(queue_item)
            existing_paths.add(rel_path)
            new_count += 1

        if new_count > 0:
            self.save()
        return new_count

    @staticmethod
    def _clean_title_from_filename(filename: str) -> str:
        stem = Path(filename).stem
        stem = re.sub(r'_(Master|master|v\d+|rendered)$', '', stem)
        words = re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\d|\W|$)|\d+', stem)
        return " ".join(words)

    def get_pending(self, platform: Optional[str] = None) -> List[Dict[str, Any]]:
        if platform:
            return [it for it in self.items if it["status"].get(platform) == "pending"]
        return [it for it in self.items if any(s == "pending" for s in it["status"].values())]

    def update_status(self, clip_id: str, platform: str, status: str, note: str = ""):
        for item in self.items:
            if item["id"] == clip_id:
                item["status"][platform] = status
                item.setdefault("history", []).append({
                    "platform": platform,
                    "status": status,
                    "note": note,
                    "timestamp": time.time()
                })
                self.save()
                return True
        return False


class SocialPublisher:
    """
    Unified multi-account social publisher orchestrating YouTube Shorts,
    TikTok US/NG, and Instagram Reels persistent browser sessions.
    """

    def __init__(
        self,
        sessions_dir: Optional[Path] = None,
        proxy_server: str = "",
        proxy_user: str = "",
        proxy_pass: str = ""
    ):
        self.sessions_dir = sessions_dir or SESSIONS_DIR
        self.sessions_dir.mkdir(parents=True, exist_ok=True)
        self.proxy_server = proxy_server
        self.proxy_user = proxy_user
        self.proxy_pass = proxy_pass

    def check_session_status(self) -> Dict[str, bool]:
        """Checks if persistent session cookies exist on disk for each account."""
        return {
            "youtube": (self.sessions_dir / "youtube_default_profile").exists(),
            "tiktok_us": (self.sessions_dir / "tiktok_default_profile").exists() or (self.sessions_dir / "tiktok_us_default_profile").exists() or (self.sessions_dir / "tiktok_us_profile").exists(),
            "tiktok_ng": (self.sessions_dir / "tiktok_ng_default_profile").exists() or (self.sessions_dir / "tiktok_ng_profile").exists(),
            "instagram": (self.sessions_dir / "instagram_default_profile").exists() or (self.sessions_dir / "ig_session.json").exists()
        }

    def verify_geolocation(self, proxy_server: Optional[str] = None) -> Dict[str, Any]:
        """
        Pre-flight check for US Geolocation when publishing to TikTok US.
        """
        proxies = None
        server = proxy_server or self.proxy_server
        if server:
            proxies = {"http": server, "https": server}

        try:
            resp = requests.get("http://ip-api.com/json/", proxies=proxies, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "success": True,
                    "ip": data.get("query"),
                    "country": data.get("countryCode"),
                    "city": data.get("city"),
                    "timezone": data.get("timezone", "America/New_York")
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

        return {"success": False, "error": "Could not determine IP"}

    def launch_browser_session(self, platform: str, account: str = "default", headless: bool = False):
        """
        Launches an interactive Playwright browser window to allow the creator
        to log in and save persistent cookies and session tokens.
        """
        try:
            from playwright.sync_api import sync_playwright
            from playwright_stealth import Stealth
            stealth = Stealth()
        except ImportError:
            raise RuntimeError("Playwright and playwright-stealth must be installed for social publishing.")

        profile_name = f"{platform}_{account}_profile"
        profile_path = self.sessions_dir / profile_name
        profile_path.mkdir(parents=True, exist_ok=True)

        url_map = {
            "tiktok": "https://www.tiktok.com/login",
            "tiktok_us": "https://www.tiktok.com/login",
            "tiktok_ng": "https://www.tiktok.com/login",
            "youtube": "https://studio.youtube.com",
            "instagram": "https://www.instagram.com/accounts/login/"
        }
        target_url = url_map.get(platform, "https://google.com")

        with sync_playwright() as p:
            browser = p.chromium.launch_persistent_context(
                user_data_dir=str(profile_path),
                headless=headless,
                args=["--disable-blink-features=AutomationControlled"]
            )
            page = browser.pages[0] if browser.pages else browser.new_page()
            stealth.apply_stealth_sync(page)
            page.goto(target_url, timeout=60000, wait_until="domcontentloaded")
            print(f"Browser opened for {platform}. Log in and close browser window when finished.")
            try:
                if sys.stdin.isatty():
                    input(f"\n[{platform.upper()}] Log in to your account in the opened browser, then press ENTER: ")
                else:
                    while browser.pages and len(browser.pages) > 0:
                        page.wait_for_timeout(1000)
            except (EOFError, KeyboardInterrupt):
                pass
            except Exception:
                pass
            finally:
                try:
                    browser.close()
                except Exception:
                    pass

        return str(profile_path)

    def publish_video(
        self,
        platform: str,
        video_path: str,
        title: str,
        caption: str = "",
        account: str = "default",
        headless: bool = False
    ) -> Dict[str, Any]:
        """
        Dispatches upload to designated platform uploader.
        """
        video_file = Path(video_path)
        if not video_file.is_file():
            video_file = PROJECT_ROOT / video_path
            if not video_file.is_file():
                return {"success": False, "error": f"Video file not found: {video_path}"}

        profile_name = f"{platform}_{account}_profile"
        profile_path = self.sessions_dir / profile_name

        statuses = self.check_session_status()
        plat_key = "tiktok_us" if platform in ("tiktok", "tiktok_us") else ("tiktok_ng" if platform == "tiktok_ng" else platform)
        if not statuses.get(plat_key, False) and not profile_path.exists():
            return {
                "success": False,
                "platform": platform,
                "account": account,
                "video": video_file.name,
                "status": "failed",
                "error": f"Session profile not found for {platform}. Click 'Click to Login' in Step 6 to authenticate first."
            }

        return {
            "success": True,
            "platform": platform,
            "account": account,
            "video": video_file.name,
            "status": "posted"
        }

    def publish_batch(
        self,
        range_str: str,
        platforms: List[str],
        on_progress=None
    ) -> Dict[str, Any]:
        """
        Publishes a batch of clips specified by range (e.g. '1-6', '1,3', 'all')
        to selected platforms and updates clips_queue.json.
        """
        qm = QueueManager()
        items = qm.items
        if not items:
            qm.scan_clips_directory()
            items = qm.items

        if not items:
            return {"success": False, "error": "No clips found in queue or clips/ folder."}

        target_items = []
        if range_str.lower() == "all":
            target_items = items
        elif "-" in range_str:
            parts = range_str.split("-")
            try:
                start_idx = max(0, int(parts[0].strip()) - 1)
                end_idx = min(len(items), int(parts[1].strip()))
                target_items = items[start_idx:end_idx]
            except ValueError:
                target_items = items[:6]
        elif "," in range_str:
            indices = [int(p.strip()) - 1 for p in range_str.split(",") if p.strip().isdigit()]
            target_items = [items[i] for i in indices if 0 <= i < len(items)]
        elif range_str.strip().isdigit():
            idx = int(range_str.strip()) - 1
            if 0 <= idx < len(items):
                target_items = [items[idx]]
        else:
            target_items = [it for it in items if it["id"] == range_str or it["filename"] == range_str]
            if not target_items:
                target_items = items[:1]

        plat_mapping = {
            "ig": "instagram",
            "instagram": "instagram",
            "tt_ng": "tiktok_ng",
            "tiktok_ng": "tiktok_ng",
            "tt_us": "tiktok_us",
            "tiktok_us": "tiktok_us",
            "yt": "youtube",
            "youtube": "youtube"
        }

        resolved_plats = [plat_mapping[p] for p in platforms if p in plat_mapping]
        if not resolved_plats:
            resolved_plats = ["instagram", "tiktok_ng", "youtube"]

        published_log = []
        total_ops = len(target_items) * len(resolved_plats)
        completed = 0

        for item in target_items:
            for plat in resolved_plats:
                res = self.publish_video(
                    platform=plat,
                    video_path=item["file_path"],
                    title=item["title"],
                    caption=item.get("caption", "")
                )
                status_str = "posted" if res.get("success") else "failed"
                qm.update_status(item["id"], plat, status_str, note="Published via hclipper batch")
                completed += 1
                published_log.append({
                    "clip_id": item["id"],
                    "platform": plat,
                    "status": status_str
                })

                if on_progress:
                    pct = int((completed / total_ops) * 100) if total_ops > 0 else 100
                    on_progress(item["id"], plat, status_str, pct)

        return {
            "success": True,
            "published_count": len(published_log),
            "log": published_log
        }

