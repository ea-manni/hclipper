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

    def check_session_status(self) -> Dict[str, Any]:
        """Checks if persistent session cookies exist on disk for each account and discovers system browser profiles."""
        browser_profiles = self.detect_system_browser_profiles()
        has_system_yt = any(p.get("browser") == "chrome" and len(p.get("emails", [])) > 0 for p in browser_profiles)
        has_custom_yt = (self.sessions_dir / "youtube_default_profile").exists()

        return {
            "youtube": has_custom_yt or has_system_yt,
            "youtube_custom": has_custom_yt,
            "youtube_system": has_system_yt,
            "tiktok_us": (self.sessions_dir / "tiktok_default_profile").exists() or (self.sessions_dir / "tiktok_us_default_profile").exists() or (self.sessions_dir / "tiktok_us_profile").exists(),
            "tiktok_ng": (self.sessions_dir / "tiktok_ng_default_profile").exists() or (self.sessions_dir / "tiktok_ng_profile").exists(),
            "instagram": (self.sessions_dir / "instagram_default_profile").exists() or (self.sessions_dir / "ig_session.json").exists(),
            "browser_profiles": browser_profiles
        }

    @staticmethod
    def detect_system_browser_profiles() -> List[Dict[str, Any]]:
        """
        Discovers authentic Google Chrome and Microsoft Edge profiles installed on the user's system,
        including authenticated Google/YouTube account emails.
        """
        profiles = []
        local_app_data = os.environ.get("LOCALAPPDATA", "")
        if not local_app_data:
            return profiles

        # 1. Google Chrome
        chrome_user_data = Path(local_app_data) / "Google" / "Chrome" / "User Data"
        if chrome_user_data.exists():
            profile_dirs = ["Default"] + [p.name for p in chrome_user_data.glob("Profile *") if p.is_dir()]
            for p in profile_dirs:
                pref_file = chrome_user_data / p / "Preferences"
                if pref_file.exists():
                    try:
                        with open(pref_file, "r", encoding="utf-8", errors="ignore") as f:
                            data = json.load(f)
                        name = data.get("profile", {}).get("name", p)
                        accs = data.get("account_info", [])
                        emails = [a.get("email") for a in accs if a.get("email")]
                        profiles.append({
                            "browser": "chrome",
                            "browser_name": "Google Chrome",
                            "profile_id": p,
                            "name": name,
                            "emails": emails,
                            "is_default": p == "Default"
                        })
                    except Exception:
                        pass

        # 2. Microsoft Edge
        edge_user_data = Path(local_app_data) / "Microsoft" / "Edge" / "User Data"
        if edge_user_data.exists():
            profile_dirs = ["Default"] + [p.name for p in edge_user_data.glob("Profile *") if p.is_dir()]
            for p in profile_dirs:
                pref_file = edge_user_data / p / "Preferences"
                if pref_file.exists():
                    try:
                        with open(pref_file, "r", encoding="utf-8", errors="ignore") as f:
                            data = json.load(f)
                        name = data.get("profile", {}).get("name", p)
                        profiles.append({
                            "browser": "edge",
                            "browser_name": "Microsoft Edge",
                            "profile_id": p,
                            "name": name,
                            "emails": [],
                            "is_default": p == "Default"
                        })
                    except Exception:
                        pass

        return profiles

    @staticmethod
    def open_system_browser(browser: str = "chrome", profile_id: str = "Default", url: str = "https://studio.youtube.com") -> bool:
        """
        Launches the creator's actual system browser using their authenticated profile.
        Completely bypasses bot/automation barriers.
        """
        import subprocess
        candidates = []
        if browser == "chrome":
            candidates = [
                r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe")
            ]
        elif browser == "edge":
            candidates = [
                r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
            ]

        exe = next((c for c in candidates if os.path.exists(c)), None)
        if not exe:
            return False

        args = [exe, f"--profile-directory={profile_id}", url]
        try:
            subprocess.Popen(args, close_fds=True)
            return True
        except Exception as e:
            print(f"Error launching system browser: {e}", file=sys.stderr)
            return False

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
        Launches an interactive browser window using real Chrome channel and stealth
        to allow the creator to log in and save persistent cookies and session tokens.
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

        # Check if Chrome channel is available
        launch_kwargs = {
            "user_data_dir": str(profile_path),
            "headless": headless,
            "viewport": {"width": 1280, "height": 850},
            "ignore_default_args": ["--enable-automation"],
            "args": [
                "--disable-blink-features=AutomationControlled",
                "--no-first-run",
                "--no-default-browser-check"
            ]
        }
        chrome_exe = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        if os.path.exists(chrome_exe):
            launch_kwargs["channel"] = "chrome"

        with sync_playwright() as p:
            browser = p.chromium.launch_persistent_context(**launch_kwargs)
            page = browser.pages[0] if browser.pages else browser.new_page()
            stealth.apply_stealth_sync(page)
            page.goto(target_url, timeout=60000, wait_until="domcontentloaded")
            print(f"Browser opened for {platform}. Log in to your account and close the browser window when finished.")
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

    def _upload_instagram(self, page, video_path: Path, title: str, caption: str, on_log=None) -> Dict[str, Any]:
        """Performs end-to-end Instagram Reels creation, upload, and sharing."""
        def log(msg, lvl="info"):
            if on_log:
                on_log(msg, lvl)
            print(f"[Instagram] {msg}")

        try:
            log("Navigating to Instagram...")
            page.goto("https://www.instagram.com/", timeout=60000, wait_until="domcontentloaded")
            page.wait_for_timeout(3000)

            # Check authentication
            if "accounts/login" in page.url or page.locator('input[name="username"]').count() > 0:
                raise RuntimeError("Instagram session is not authenticated. Please log in first in Step 6.")

            # Dismiss notification / prompt / cookie overlays
            dismiss_selectors = [
                'button:has-text("Not Now")',
                'button:has-text("Cancel")',
                'button:has-text("Decline optional cookies")',
                'button:has-text("Only allow essential cookies")',
                'button:has-text("Allow all cookies")',
                'button:has-text("Turn on Notifications")',
                'button:has-text("Save Info")',
                'button:has-text("Save info")',
                'button:has-text("Dismiss")'
            ]
            for sel in dismiss_selectors:
                for btn in page.locator(sel).all():
                    try:
                        if btn.is_visible():
                            btn.click(force=True, timeout=1000)
                            page.wait_for_timeout(500)
                    except Exception:
                        pass

            log("Opening 'Create New Post' modal...")
            create_selectors = [
                'svg[aria-label="New post"]',
                'svg[aria-label="Create"]',
                '[aria-label="New post"]',
                '[aria-label="Create"]',
                'a:has(svg[aria-label="New post"])',
                'a:has(svg[aria-label="Create"])',
                'div[role="button"]:has(svg[aria-label="New post"])',
                'span:text-is("Create")',
                'a:has-text("Create")',
                'button:has-text("Create")'
            ]
            clicked_create = False
            for sel in create_selectors:
                loc = page.locator(sel).first
                if loc.count() > 0 and loc.is_visible():
                    loc.click(force=True)
                    clicked_create = True
                    break

            if not clicked_create:
                page.keyboard.press("c")

            page.wait_for_timeout(1500)

            # Check if clicking Create opened the dropdown menu with "Post"
            post_menu_options = [
                'div[role="menu"] span:text-is("Post")',
                'div[role="dialog"] span:text-is("Post")',
                'div[role="menu"] a:has-text("Post")',
                'div[role="menu"] div[role="button"]:has-text("Post")',
                'span:text-is("Post")',
                'a:has-text("Post")'
            ]
            for psel in post_menu_options:
                ploc = page.locator(psel).first
                if ploc.count() > 0 and ploc.is_visible():
                    ploc.click(force=True)
                    page.wait_for_timeout(1500)
                    break

            # Attach video
            log("Attaching video file...")
            file_input = page.locator('div[role="dialog"] input[type="file"], input[type="file"]').first
            try:
                file_input.wait_for(state="attached", timeout=12000)
            except Exception:
                # If file input not yet attached, try clicking "Select from computer" button
                sel_btn = page.locator('button:has-text("Select from computer"), div[role="button"]:has-text("Select from computer")').first
                if sel_btn.count() > 0 and sel_btn.is_visible():
                    sel_btn.click(force=True)
                    page.wait_for_timeout(1000)
                file_input = page.locator('div[role="dialog"] input[type="file"], input[type="file"]').first
                file_input.wait_for(state="attached", timeout=15000)

            file_input.set_input_files(str(video_path.resolve()))
            page.wait_for_timeout(3500)

            # Handle 'Video posts are now shared as reels' modal or OK prompts
            try:
                ok_btn = page.locator('div[role="dialog"] button:has-text("OK"), button:has-text("OK")').first
                if ok_btn.is_visible(timeout=3000):
                    ok_btn.click(force=True)
                    page.wait_for_timeout(1000)
            except Exception:
                pass

            # Step 1: Crop -> Click Next
            log("Advancing past crop settings...")
            next_btn = page.locator('div[role="dialog"] button:has-text("Next"), div[role="dialog"] div[role="button"]:has-text("Next"), div:text-is("Next")').first
            next_btn.wait_for(state="visible", timeout=25000)
            next_btn.click(force=True)
            page.wait_for_timeout(2500)

            # Step 2: Cover / Filters -> Click Next
            log("Advancing past cover and trim...")
            next_btn = page.locator('div[role="dialog"] button:has-text("Next"), div[role="dialog"] div[role="button"]:has-text("Next"), div:text-is("Next")').first
            next_btn.wait_for(state="visible", timeout=25000)
            next_btn.click(force=True)
            page.wait_for_timeout(2500)

            # Step 3: Caption
            log("Adding caption and hashtags...")
            caption_box = page.locator('div[role="dialog"] div[contenteditable="true"], div[role="dialog"] textarea, [aria-label*="caption" i]').first
            full_caption = f"{title}\n\n{caption}".strip()
            if caption_box.count() > 0 and caption_box.is_visible():
                caption_box.click(force=True)
                caption_box.fill(full_caption)
                page.wait_for_timeout(1500)

            # Step 4: Click Share
            log("Clicking 'Share' button...")
            share_btn = page.locator('div[role="dialog"] button:has-text("Share"), div[role="dialog"] div[role="button"]:has-text("Share"), div:text-is("Share")').first
            share_btn.wait_for(state="visible", timeout=15000)
            share_btn.click(force=True)

            # Step 5: Wait for real confirmation
            log("Uploading video & awaiting Instagram confirmation (up to 90s)...")
            success_loc = page.locator('text="Your reel has been shared", text="Your post has been shared", svg[aria-label="Animated checkmark"]').first
            try:
                success_loc.wait_for(state="visible", timeout=90000)
                log("Confirmed! Reel published successfully to Instagram.", "success")
                return {"status": "posted", "note": "Reel shared to Instagram"}
            except Exception:
                if page.locator('div[role="dialog"]').count() == 0:
                    log("Reel upload completed and modal closed.", "success")
                    return {"status": "posted", "note": "Reel shared to Instagram"}
                raise RuntimeError("Timed out waiting for Instagram reel confirmation.")
        except Exception as e:
            try:
                err_shot = PROJECT_ROOT / "scratch" / f"publish_error_instagram_{int(time.time())}.png"
                page.screenshot(path=str(err_shot))
            except Exception:
                pass
            raise e

    def _upload_tiktok(self, page, video_path: Path, title: str, caption: str, on_log=None) -> Dict[str, Any]:
        """Performs end-to-end TikTok Studio upload, captioning, and publishing."""
        def log(msg, lvl="info"):
            if on_log:
                on_log(msg, lvl)
            print(f"[TikTok] {msg}")

        def dismiss_tiktok_popups():
            for _ in range(4):
                popups = page.locator('div.TUXModal-overlay, div[data-floating-ui-portal], div[role="dialog"]')
                if popups.count() == 0:
                    break
                btns = page.locator(
                    'div.TUXModal-overlay button, div[data-floating-ui-portal] button, '
                    'button:has-text("Got it"), button:has-text("OK"), button:has-text("Understand"), '
                    'button:has-text("Allow"), button:has-text("Dismiss"), [aria-label="Close"], button[class*="close"]'
                )
                clicked = False
                for i in range(min(btns.count(), 5)):
                    try:
                        b = btns.nth(i)
                        if b.is_visible():
                            b.click(force=True, timeout=1000)
                            clicked = True
                            page.wait_for_timeout(400)
                    except Exception:
                        pass
                page.keyboard.press("Escape")
                page.wait_for_timeout(400)
                if not clicked:
                    break

        try:
            log("Navigating to TikTok Creator Studio upload page...")
            page.goto("https://www.tiktok.com/tiktokstudio/upload", timeout=60000, wait_until="domcontentloaded")
            page.wait_for_timeout(4000)

            # Check authentication
            if "login" in page.url or page.locator('button:has-text("Log in"), a[href*="login"]').first.is_visible():
                raise RuntimeError("TikTok session is not authenticated. Please log in first in Step 6.")

            # Identify upload scope (direct or iframe)
            target_scope = page
            for frame in page.frames:
                if "upload" in frame.url or "creator" in frame.url:
                    target_scope = frame
                    break

            log("Attaching video file to TikTok uploader...")
            file_input = target_scope.locator('input[type="file"]').first
            try:
                file_input.wait_for(state="attached", timeout=20000)
            except Exception:
                file_input = page.locator('input[type="file"]').first
                file_input.wait_for(state="attached", timeout=15000)

            file_input.set_input_files(str(video_path.resolve()))
            page.wait_for_timeout(4000)

            # Dismiss copyright check and onboarding popups
            dismiss_tiktok_popups()

            log("Setting caption & hashtags...")
            caption_box = page.locator('div[contenteditable="true"], div.DraftEditor-editorContainer, textarea[placeholder*="caption" i]').first
            full_caption = f"{title} {caption}".strip()
            try:
                caption_box.wait_for(state="visible", timeout=25000)
                caption_box.click(force=True)
                page.keyboard.press("Control+A")
                page.keyboard.press("Backspace")
                caption_box.fill(full_caption)
                page.wait_for_timeout(1000)
            except Exception as e:
                log(f"Caption prefill note: {e}", "warn")

            dismiss_tiktok_popups()

            log("Waiting for video upload & transcoding (monitoring Post button)...")
            # Select only the real publish button in the form footer, NOT the sidebar
            post_selectors = [
                'button[class*="btn-post"]',
                'div.btn-post button',
                'div[class*="btn-post"]',
                'div[class*="footer"] button:has-text("Post")',
                'button:not([data-tt*="Sidebar"]):text-is("Post")',
                'div[role="button"]:not([data-tt*="Sidebar"]):text-is("Post")'
            ]
            post_btn = None
            for psel in post_selectors:
                loc = page.locator(psel).first
                if loc.count() > 0 and loc.is_visible():
                    post_btn = loc
                    break

            if not post_btn:
                post_btn = page.locator('button:not([data-tt*="Sidebar"]):has-text("Post")').first
                post_btn.wait_for(state="visible", timeout=35000)

            # Wait until Post button is active and enabled
            start_t = time.time()
            while time.time() - start_t < 120:
                dismiss_tiktok_popups()
                try:
                    is_disabled = post_btn.is_disabled() or post_btn.get_attribute("disabled") is not None
                    classes = post_btn.get_attribute("class") or ""
                    if not is_disabled and "disabled" not in classes.lower():
                        break
                except Exception:
                    pass
                page.wait_for_timeout(2000)

            dismiss_tiktok_popups()
            log("Clicking 'Post' button...")
            post_btn.click(force=True)
            page.wait_for_timeout(3000)

            # Handle post-confirmation modals if prompted
            for confirm_btn in page.locator('button:has-text("Post now"), button:has-text("Continue to post")').all():
                try:
                    if confirm_btn.is_visible():
                        confirm_btn.click(force=True)
                        page.wait_for_timeout(2000)
                except Exception:
                    pass

            log("Awaiting TikTok publish confirmation...")
            success_loc = page.locator('text="Your video has been uploaded", text="Manage your posts", text="Upload another video"').first
            try:
                success_loc.wait_for(state="visible", timeout=60000)
                log("Confirmed! Video published successfully to TikTok.", "success")
                return {"status": "posted", "note": "Video published to TikTok"}
            except Exception:
                if "manage" in page.url or "content" in page.url:
                    log("Confirmed! Navigated to TikTok manage posts.", "success")
                    return {"status": "posted", "note": "Video published to TikTok"}
                raise RuntimeError("Timed out waiting for TikTok post confirmation.")
        except Exception as e:
            try:
                err_shot = PROJECT_ROOT / "scratch" / f"publish_error_tiktok_{int(time.time())}.png"
                page.screenshot(path=str(err_shot))
            except Exception:
                pass
            raise e

    def _upload_youtube(self, page, video_path: Path, title: str, caption: str, on_log=None) -> Dict[str, Any]:
        """Performs YouTube Studio upload, sets title/description/visibility, and publishes Short."""
        def log(msg, lvl="info"):
            if on_log:
                on_log(msg, lvl)
            print(f"[YouTube] {msg}")

        try:
            log("Navigating to YouTube Studio...")
            page.goto("https://studio.youtube.com", timeout=60000, wait_until="domcontentloaded")
            page.wait_for_timeout(4000)

            # Check authentication
            if "accounts.google.com" in page.url or "signin" in page.url:
                # Dedicated automated session is not signed in (due to Google's strict automated browser protection).
                # Gracefully stage the clip for the user's authentic Chrome browser profile!
                browser_profiles = self.detect_system_browser_profiles()
                chrome_prof = next((p for p in browser_profiles if p.get("browser") == "chrome" and len(p.get("emails", [])) > 0), None)
                if not chrome_prof and browser_profiles:
                    chrome_prof = browser_profiles[0]

                if chrome_prof:
                    log(f"Google prevents automated logins. Automatically staging YouTube Short in your authentic {chrome_prof.get('browser_name', 'Chrome')} profile ({chrome_prof.get('name', 'Default')})...", "info")
                    # Copy title & caption to clipboard using Windows clip.exe
                    try:
                        clip_text = f"{title}\n\n{caption}\n\n#Shorts".strip()
                        import subprocess
                        subprocess.run(["clip"], input=clip_text.encode("utf-16"), check=True)
                    except Exception:
                        pass
                    # Open authentic Chrome profile with YouTube Studio
                    self.open_system_browser(browser=chrome_prof.get("browser", "chrome"), profile_id=chrome_prof.get("profile_id", "Default"))
                    return {
                        "status": "staged",
                        "note": f"Staged in authentic {chrome_prof.get('browser_name', 'Chrome')} ({chrome_prof.get('name', 'Default')}). Title copied to clipboard."
                    }
                raise RuntimeError("YouTube session is not authenticated. Please select or connect your Google Chrome profile in Step 6.")

            log("Clicking 'CREATE' -> 'Upload videos'...")
            create_btn = page.locator('#create-icon, button[aria-label="Create"], ytcp-button#create-icon').first
            create_btn.wait_for(state="visible", timeout=25000)
            create_btn.click()
            page.wait_for_timeout(1200)

            upload_item = page.locator('tp-yt-paper-item:has-text("Upload videos"), [test-id="upload-beta"]').first
            upload_item.wait_for(state="visible", timeout=12000)
            upload_item.click()
            page.wait_for_timeout(2000)

            log("Attaching video file to YouTube Studio...")
            file_input = page.locator('input[type="file"]').first
            file_input.wait_for(state="attached", timeout=20000)
            file_input.set_input_files(str(video_path.resolve()))
            page.wait_for_timeout(4000)

            log("Setting video Title and Description...")
            # YouTube shorts title max 100 chars
            title_box = page.locator('#title-textarea #textbox, [aria-label*="title" i]').first
            title_box.wait_for(state="visible", timeout=25000)
            title_box.click()
            title_clean = title[:95].strip()
            title_box.fill(title_clean)
            page.wait_for_timeout(1000)

            desc_box = page.locator('#description-textarea #textbox, [aria-label*="description" i]').first
            if desc_box.is_visible():
                desc_box.click()
                desc_text = f"{title}\n\n{caption}\n\n#Shorts".strip()
                desc_box.fill(desc_text)
                page.wait_for_timeout(1000)

            log("Setting audience: 'No, it's not made for kids'...")
            not_for_kids = page.locator('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"], [name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]').first
            not_for_kids.wait_for(state="visible", timeout=15000)
            not_for_kids.click()
            page.wait_for_timeout(1000)

            # Step through wizard: Next -> Next -> Next
            log("Advancing through video elements and checks...")
            for step in range(3):
                next_btn = page.locator('#next-button').first
                next_btn.wait_for(state="visible", timeout=15000)
                next_btn.click()
                page.wait_for_timeout(2000)

            log("Setting Visibility: Public...")
            public_radio = page.locator('tp-yt-paper-radio-button[name="PUBLIC"], [name="PUBLIC"]').first
            public_radio.wait_for(state="visible", timeout=15000)
            public_radio.click()
            page.wait_for_timeout(1000)

            log("Clicking 'Publish' button...")
            done_btn = page.locator('#done-button').first
            done_btn.wait_for(state="visible", timeout=15000)
            done_btn.click()

            log("Awaiting YouTube publish confirmation...")
            done_dialog = page.locator('text="Video published", text="Video uploaded", a[href*="youtu.be"]').first
            done_dialog.wait_for(state="visible", timeout=90000)
            log("Confirmed! Short published successfully to YouTube Studio.", "success")
            return {"status": "posted", "note": "Short published to YouTube"}
        except Exception as e:
            try:
                err_shot = PROJECT_ROOT / "scratch" / f"publish_error_youtube_{int(time.time())}.png"
                page.screenshot(path=str(err_shot))
            except Exception:
                pass
            raise e

    def publish_video(
        self,
        platform: str,
        video_path: str,
        title: str,
        caption: str = "",
        account: str = "default",
        headless: bool = False,
        on_log=None
    ) -> Dict[str, Any]:
        """
        Dispatches upload to designated platform uploader. Captures real errors and screenshots.
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

        try:
            from playwright.sync_api import sync_playwright
            from playwright_stealth import Stealth
            stealth = Stealth()
        except ImportError:
            return {
                "success": False,
                "platform": platform,
                "account": account,
                "video": video_file.name,
                "status": "failed",
                "error": "Playwright is not installed. Run 'pip install playwright playwright-stealth' and 'playwright install chromium'."
            }

        launch_kwargs = {
            "user_data_dir": str(profile_path),
            "headless": headless,
            "viewport": {"width": 1280, "height": 850},
            "ignore_default_args": ["--enable-automation"],
            "args": [
                "--disable-blink-features=AutomationControlled",
                "--no-first-run",
                "--no-default-browser-check"
            ]
        }
        chrome_exe = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        if os.path.exists(chrome_exe):
            launch_kwargs["channel"] = "chrome"

        scratch_dir = PROJECT_ROOT / "scratch"
        scratch_dir.mkdir(parents=True, exist_ok=True)

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch_persistent_context(**launch_kwargs)
                page = browser.pages[0] if browser.pages else browser.new_page()
                stealth.apply_stealth_sync(page)

                if platform == "instagram":
                    res = self._upload_instagram(page, video_file, title, caption, on_log=on_log)
                elif platform in ("tiktok", "tiktok_ng", "tiktok_us"):
                    res = self._upload_tiktok(page, video_file, title, caption, on_log=on_log)
                elif platform == "youtube":
                    res = self._upload_youtube(page, video_file, title, caption, on_log=on_log)
                else:
                    raise ValueError(f"Unsupported social platform: {platform}")

                page.wait_for_timeout(3000)
                browser.close()

            return {
                "success": True,
                "platform": platform,
                "account": account,
                "video": video_file.name,
                "status": res.get("status", "posted"),
                "note": res.get("note", "Published successfully")
            }
        except Exception as e:
            err_msg = str(e)
            try:
                err_shot = scratch_dir / f"publish_error_{platform}_{int(time.time())}.png"
                page.screenshot(path=str(err_shot))
            except Exception:
                pass
            return {
                "success": False,
                "platform": platform,
                "account": account,
                "video": video_file.name,
                "status": "failed",
                "error": f"Automation error while publishing to {platform}: {err_msg}"
            }

    def publish_batch(
        self,
        range_str: str,
        platforms: List[str],
        on_progress=None
    ) -> Dict[str, Any]:
        """
        Publishes a batch of clips specified by range to selected platforms and updates clips_queue.json.
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

        def _report_progress(clip_id, plat_name, status, pct, note=""):
            if not on_progress:
                return
            try:
                on_progress(clip_id, plat_name, status, pct, note=note)
            except TypeError:
                try:
                    on_progress(clip_id, plat_name, status, pct)
                except Exception:
                    pass

        for item in target_items:
            for plat in resolved_plats:
                def item_log(msg, lvl="info"):
                    pct = int((completed / total_ops) * 100) if total_ops > 0 else 0
                    _report_progress(item["id"], plat, "uploading", pct, note=msg)

                res = self.publish_video(
                    platform=plat,
                    video_path=item["file_path"],
                    title=item["title"],
                    caption=item.get("caption", ""),
                    on_log=item_log
                )
                status_str = res.get("status", "failed") if res.get("success") else "failed"
                note_str = res.get("note") or res.get("error", "")
                qm.update_status(item["id"], plat, status_str, note=note_str)
                completed += 1
                published_log.append({
                    "clip_id": item["id"],
                    "platform": plat,
                    "status": status_str,
                    "note": note_str,
                    "error": res.get("error")
                })

                pct = int((completed / total_ops) * 100) if total_ops > 0 else 100
                _report_progress(item["id"], plat, status_str, pct, note=note_str)

        return {
            "success": any(entry["status"] in ("posted", "staged") for entry in published_log),
            "published_count": sum(1 for entry in published_log if entry["status"] == "posted"),
            "staged_count": sum(1 for entry in published_log if entry["status"] == "staged"),
            "failed_count": sum(1 for entry in published_log if entry["status"] == "failed"),
            "log": published_log
        }

