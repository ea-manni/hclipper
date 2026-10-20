"""
hclipper Unified Command Line Interface
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CLI entry point for running individual pipeline modules or the full end-to-end
media processing pipeline headless. Supports JSON-RPC stdout output for Electron IPC.
"""

import sys
import os
import re
import json
import argparse
from pathlib import Path

# Force UTF-8 encoding on Windows to prevent UnicodeEncodeError
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from engine import HARDWARE_ENCODER
from engine.downloader import MediaDownloader
from engine.trimmer import TimelineTrimmer
from engine.audio_dsp import AudioDSP
from engine.reframe import AutoReframer
from engine.subtitles import SubtitleEngine
from engine.publisher import QueueManager, SocialPublisher

def emit_json(event_type: str, data: dict):
    """Outputs a JSON event message to stdout for Electron IPC reading."""
    payload = {"event": event_type, **data}
    print(f"__HCLIPPER_JSON__{json.dumps(payload, ensure_ascii=True)}", flush=True)

def cmd_download(args):
    downloader = MediaDownloader(download_dir=args.out)
    if args.info:
        try:
            info = downloader.extract_info(args.url)
            if args.json:
                emit_json("info", info)
            else:
                print(json.dumps(info, indent=2))
        except Exception as e:
            if args.json:
                emit_json("error", {"error": str(e)})
            else:
                print(f"Error extracting info: {e}")
        return

    def on_progress(d):
        if args.json:
            emit_json("progress", d)
        else:
            pct = d.get("percent", 0)
            status = d.get("status", "")
            print(f"[{status}] {pct}%", end="\r", flush=True)

    try:
        result = downloader.download(
            args.url,
            download_subs=getattr(args, "with_subs", False),
            cookies_from_browser=getattr(args, "cookies_from_browser", None),
            cookiefile=getattr(args, "cookies", None),
            progress_callback=on_progress
        )
        if args.json:
            emit_json("result", result)
        else:
            print("\nDownload finished:", result["video_path"])
    except Exception as e:
        if args.json:
            emit_json("error", {"error": str(e)})
        else:
            print(f"\nDownload failed: {e}")
        sys.exit(1)

def cmd_waveform(args):
    trimmer = TimelineTrimmer()
    peaks = trimmer.generate_waveform_peaks(args.input, points=args.points)
    if args.json:
        emit_json("waveform", {"peaks": peaks, "count": len(peaks)})
    else:
        print(f"Generated {len(peaks)} waveform peaks.")
        print(peaks[:20], "...")

def cmd_trim(args):
    trimmer = TimelineTrimmer()
    if args.cadence:
        print("Executing cadence-preserving silence trimming...")
        start_t = getattr(args, "start", None)
        end_t = getattr(args, "end", None)
        res = trimmer.cadence_silence_trim(
            args.input,
            args.output,
            noise_threshold=args.threshold,
            min_silence=args.min_silence,
            start_sec=float(start_t) if start_t is not None else None,
            end_sec=float(end_t) if end_t is not None else None
        )
        if args.json:
            emit_json("trim_result", res)
        else:
            print(f"Original: {res['original_duration']:.2f}s -> Trimmed: {res['trimmed_duration']:.2f}s (Saved {res['time_saved']:.2f}s)")
    else:
        if args.start is None or args.end is None:
            print("Error: Manual cut requires --start and --end timestamps in seconds.")
            sys.exit(1)
        success = trimmer.cut_range(args.input, args.output, args.start, args.end)
        if args.json:
            emit_json("cut_result", {"success": success, "output": args.output})
        else:
            print("Cut completed successfully:", args.output if success else "Failed")

def cmd_reframe(args):
    reframer = AutoReframer(model_path=args.model)
    aspect_map = {
        "9:16": ((9, 16), 1080, 1920),
        "1:1": ((1, 1), 1080, 1080),
        "16:9": ((16, 9), 1920, 1080),
    }
    ratio_tuple, out_w, out_h = aspect_map.get(getattr(args, "aspect", "9:16"), ((9, 16), 1080, 1920))
    deadzone = getattr(args, "deadzone", 25.0)
    smooth_factor = getattr(args, "smooth", 0.06)

    def on_progress(p):
        if args.json:
            emit_json("reframe_progress", p)
        else:
            print(f"[{p.get('phase')}] {p.get('percent')}%", end="\r", flush=True)

    start_t = getattr(args, "start", None)
    end_t = getattr(args, "end", None)

    try:
        if args.trajectory_only:
            def on_trajectory_progress(p):
                scaled_pct = min(100.0, round(float(p.get("percent", 0.0)) * 2.0, 1))
                if args.json:
                    emit_json("trajectory_progress", {"phase": "tracking", "percent": scaled_pct})
                else:
                    print(f"[tracking] {scaled_pct}%", end="\r", flush=True)

            traj = reframer.compute_crop_trajectory(
                args.input,
                aspect_ratio=ratio_tuple,
                deadzone=deadzone,
                smooth_factor=smooth_factor,
                start_time=start_t,
                end_time=end_t,
                progress_callback=on_trajectory_progress
            )
            if args.json:
                emit_json("trajectory", traj)
            else:
                print(f"\nTrajectory calculated: {traj['total_frames']} frames")
            return

        res = reframer.render_reframed_video(
            args.input,
            args.output,
            out_width=out_w,
            out_height=out_h,
            start_time=start_t,
            end_time=end_t,
            progress_callback=on_progress
        )
        if args.json:
            emit_json("reframe_result", {"success": res, "output": args.output, "aspect": getattr(args, "aspect", "9:16")})
        else:
            print("\nAuto-reframe render completed:", args.output)
    except Exception as e:
        if args.json:
            emit_json("reframe_result", {"success": False, "error": str(e), "output": args.output})
        else:
            print(f"\nAuto-reframe failed: {e}", file=sys.stderr)
        sys.exit(1)

def cmd_subtitles(args):
    sub = SubtitleEngine()
    if args.vtt:
        cues = sub.parse_vtt_file(args.vtt)
    else:
        print("Transcribing with Whisper...")
        cues = sub.transcribe_with_whisper(args.input, model_size=args.model_size)

    ass_path = sub.generate_ass(cues, args.output, style_preset=args.preset)
    if args.json:
        emit_json("subtitles_result", {"ass_file": ass_path, "cues_count": len(cues), "cues": cues})
    else:
        print(f"Generated ASS subtitles at {ass_path} ({len(cues)} cues)")

def cmd_banner(args):
    sub = SubtitleEngine()
    banner_path = sub.create_hook_banner(args.title, args.output, banner_style=getattr(args, "style", "frosted_gold"))
    if args.json:
        emit_json("banner_result", {"banner_file": banner_path})
    else:
        print(f"Generated hook banner at {banner_path}")

def cmd_master_audio(args):
    dsp = AudioDSP()
    if args.music:
        success = dsp.mix_speech_and_music(
            args.input,
            args.music,
            args.output,
            music_volume=args.music_vol,
            total_duration=args.duration or 0.0
        )
    else:
        success = dsp.process_speech_track(args.input, args.output)

    if args.json:
        emit_json("audio_master_result", {"success": success, "output": args.output})
    else:
        print("Audio mastering complete:", args.output if success else "Failed")

def cmd_publish(args):
    qm = QueueManager()
    if args.scan:
        count = qm.scan_clips_directory()
        if args.json:
            emit_json("scan_result", {"new_count": count, "total": len(qm.items)})
        else:
            print(f"Scanned clips. Added {count} new clips. Total: {len(qm.items)}")
    elif args.list:
        if args.json:
            emit_json("queue_items", {"items": qm.items})
        else:
            print(json.dumps(qm.items, indent=2))
    elif args.publish:
        publisher = SocialPublisher()
        platforms = [p.strip() for p in args.platforms.split(",") if p.strip()]

        def progress_cb(clip_id, platform, status, pct, note=None, **kwargs):
            if args.json:
                payload = {
                    "clip_id": clip_id,
                    "platform": platform,
                    "status": status,
                    "progress": pct
                }
                if note:
                    payload["note"] = note
                emit_json("publish_progress", payload)
            else:
                detail = f" - {note}" if note else ""
                print(f"[{pct}%] {clip_id} -> {platform}: {status}{detail}")

        print(f"Publishing clips matching '{args.publish}' to {platforms}...")
        res = publisher.publish_batch(args.publish, platforms, on_progress=progress_cb)
        if args.json:
            emit_json("publish_result", res)
        else:
            print(f"Batch completed: {res.get('published_count', 0)} operations.")
    else:
        print("Use --scan, --list, or --publish for publisher queue.")

def cmd_login(args):
    publisher = SocialPublisher()
    print(f"Opening interactive session for {args.platform}...")
    try:
        profile_path = publisher.launch_browser_session(args.platform)
        if args.json:
            emit_json("login_result", {"success": True, "platform": args.platform, "profile_path": profile_path})
        else:
            print(f"Successfully authenticated and saved session for {args.platform}!")
    except Exception as e:
        if args.json:
            emit_json("login_result", {"success": False, "platform": args.platform, "error": str(e)})
        else:
            print(f"Login failed: {e}")

def cmd_highlights(args):
    try:
        from engine.highlight_detector import HighlightScout
        scout = HighlightScout(provider=args.provider, api_key=args.api_key, model=args.model)
        transcript_text = ""
        if args.input and os.path.exists(args.input):
            with open(args.input, "r", encoding="utf-8", errors="replace") as f:
                transcript_text = f.read()
        elif args.text:
            transcript_text = args.text

        clips = scout.analyze_transcript(
            transcript_text=transcript_text,
            video_path=getattr(args, "video", None),
            count=getattr(args, "count", 5),
            duration=getattr(args, "duration", "standard")
        )
        if args.json:
            emit_json("highlights_result", {"clips": clips})
        else:
            print(json.dumps(clips, indent=2))
    except Exception as e:
        if args.json:
            emit_json("highlights_result", {"clips": [], "error": str(e)})
        else:
            print(f"Highlight scouting error: {e}", file=sys.stderr)
        sys.exit(1)

def cmd_session_status(args):
    publisher = SocialPublisher()
    status = publisher.check_session_status()
    if args.json:
        emit_json("session_status", status)
    else:
        print(json.dumps(status, indent=2))

def cmd_browser_profiles(args):
    publisher = SocialPublisher()
    profiles = publisher.detect_system_browser_profiles()
    if args.json:
        emit_json("browser_profiles", {"profiles": profiles})
    else:
        print(json.dumps(profiles, indent=2))

def cmd_open_browser_studio(args):
    publisher = SocialPublisher()
    url = getattr(args, "url", "https://studio.youtube.com") or "https://studio.youtube.com"
    profile = getattr(args, "profile", "Default") or "Default"
    browser = getattr(args, "browser", "chrome") or "chrome"
    success = publisher.open_system_browser(browser=browser, profile_id=profile, url=url)
    if args.json:
        emit_json("open_browser_result", {"success": success, "browser": browser, "profile": profile, "url": url})
    else:
        print(f"Opened {browser} profile '{profile}' to {url}: {success}")

def cmd_motion(args):
    from engine.motion.pipeline import DynamicMotionPipeline
    from engine.subtitles import SubtitleEngine
    from engine.reframe import AutoReframer
    import tempfile
    try:
        pipeline = DynamicMotionPipeline()
        sub = SubtitleEngine()
        reframer = AutoReframer()

        input_video = reframer._resolve_video_path(args.input)
        output_video = reframer._resolve_output_path(args.output)

        # Check for transcript cues to burn synchronized subtitles into dynamic motion clip
        ass_path = None
        cues = []
        if getattr(args, "text_cues", None):
            raw_cues = str(args.text_cues).strip()
            if os.path.isfile(raw_cues):
                try:
                    with open(raw_cues, "r", encoding="utf-8") as f:
                        cues = json.load(f)
                except Exception as e:
                    print(f"[cmd_motion] Failed to parse cues file {raw_cues}: {e}", flush=True)
            else:
                try:
                    cues = json.loads(raw_cues)
                except Exception:
                    pass

        if not cues and getattr(args, "vtt", None) and os.path.exists(args.vtt):
            cues = sub.parse_vtt_file(args.vtt)

        if not cues:
            v_path = Path(args.input)
            for ext in [".en.vtt", ".vtt", ".en.srt", ".srt"]:
                cand = v_path.with_suffix(ext)
                if cand.exists():
                    cues = sub.parse_vtt_file(str(cand))
                    break
                cand2 = v_path.parent / f"{v_path.stem}{ext}"
                if cand2.exists():
                    cues = sub.parse_vtt_file(str(cand2))
                    break

        temp_ass = None
        if cues and not getattr(args, "no_subs", False):
            temp_ass = Path(tempfile.gettempdir()) / f"hclipper_motion_{Path(args.output).stem}.ass"
            sub.generate_ass(
                cues,
                str(temp_ass),
                style_preset=getattr(args, "preset", "tiktok_bold")
            )
            ass_path = str(temp_ass)

        speaker_val = getattr(args, "speaker", None) or ""
        speaker_val = re.sub(r'\[.*?\]|\(.*?\)', '', speaker_val).strip()
        topic_val = getattr(args, "topic", None) or ""
        topic_val = re.sub(r'\[.*?\]|\(.*?\)', '', topic_val).strip()

        custom_cues = None
        if getattr(args, "custom_cues", None):
            raw_cc = str(args.custom_cues).strip()
            if os.path.isfile(raw_cc):
                try:
                    with open(raw_cc, "r", encoding="utf-8") as f:
                        custom_cues = json.load(f)
                except Exception as e:
                    print(f"[cmd_motion] Failed to parse custom_cues file {raw_cc}: {e}", flush=True)
            else:
                try:
                    custom_cues = json.loads(raw_cc)
                except Exception:
                    pass

        out = pipeline.process_clip(
            video_path=input_video,
            output_path=output_video,
            transcript_cues=cues,
            clip_headline=getattr(args, "headline", None) or "",
            speaker=speaker_val,
            topic=topic_val,
            custom_cues=custom_cues,
            template_name=getattr(args, "template", None) or "collage_motion.html",
            subtitle_ass_path=ass_path
        )

        if temp_ass and temp_ass.exists():
            try:
                temp_ass.unlink()
            except Exception:
                pass

        if args.json:
            emit_json("motion_result", {"success": True, "output": out})
        else:
            print(f"Motion design clip rendered: {out}")
    except Exception as e:
        if args.json:
            emit_json("motion_result", {"success": False, "error": str(e), "output": args.output})
        else:
            print(f"Motion design rendering failed: {e}", file=sys.stderr)
        sys.exit(1)
def cmd_export_clip(args):
    """Renders full master short combining auto-reframe, subtitles, hook banner, and audio DSP."""
    from engine.subtitles import SubtitleEngine
    from engine.reframe import AutoReframer
    from engine.audio_dsp import AudioDSP
    from engine.trimmer import TimelineTrimmer
    from engine.publisher import QueueManager
    import tempfile
    import shutil

    sub = SubtitleEngine()
    reframer = AutoReframer()
    trimmer = TimelineTrimmer()

    input_video = reframer._resolve_video_path(args.input)
    output_video = reframer._resolve_output_path(args.output)

    start_time = getattr(args, "start", None)
    end_time = getattr(args, "end", None)
    aspect = getattr(args, "aspect", "9:16")
    deadzone = getattr(args, "deadzone", 25.0)
    smooth = getattr(args, "smooth", 0.06)

    aspect_map = {
        "9:16": ((9, 16), 1080, 1920),
        "1:1": ((1, 1), 1080, 1080),
        "16:9": ((16, 9), 1920, 1080),
    }
    ratio_tuple, out_w, out_h = aspect_map.get(aspect, ((9, 16), 1080, 1920))

    def on_progress(p):
        if args.json:
            emit_json("export_progress", p)
        else:
            print(f"[{p.get('phase', 'export')}] {p.get('percent', 0)}%", end="\\r", flush=True)

    try:
        on_progress({"phase": "init", "percent": 5})
        temp_dir = Path(tempfile.mkdtemp(prefix="hclipper_export_"))

        # 1. Cadence pause trimming if requested
        work_input = input_video
        clip_start = start_time
        clip_end = end_time

        if getattr(args, "cadence", False):
            on_progress({"phase": "cadence_trim", "percent": 15})
            trimmed_seg = temp_dir / "cadence_trimmed.mp4"
            if start_time is not None and end_time is not None:
                range_cut = temp_dir / "range_cut.mp4"
                trimmer.cut_range(input_video, str(range_cut), start_time, end_time, reencode=True)
                trimmer.cadence_silence_trim(
                    str(range_cut), str(trimmed_seg),
                    noise_threshold=getattr(args, "threshold", "-33dB"),
                    min_silence=getattr(args, "min_silence", 0.75)
                )
                work_input = str(trimmed_seg)
                clip_start = None
                clip_end = None
            else:
                trimmer.cadence_silence_trim(
                    input_video, str(trimmed_seg),
                    noise_threshold=getattr(args, "threshold", "-33dB"),
                    min_silence=getattr(args, "min_silence", 0.75)
                )
                work_input = str(trimmed_seg)

        # 2. Render reframed vertical video
        on_progress({"phase": "reframing", "percent": 30})
        reframed_temp = temp_dir / "reframed_temp.mp4"
        reframer.render_reframed_video(
            work_input,
            str(reframed_temp),
            out_width=out_w,
            out_height=out_h,
            start_time=clip_start,
            end_time=clip_end,
            progress_callback=lambda p: on_progress({"phase": "reframing", "percent": 25.0 + (p.get("percent", 0.0) * 0.35)})
        )

        actual_clip_dur = trimmer.get_duration(str(reframed_temp))

        # 3. Generate Subtitles ASS file
        ass_path = None
        if not getattr(args, "no_subs", False):
            on_progress({"phase": "subtitles", "percent": 65})
            cues = []
            if getattr(args, "text_cues", None):
                raw_cues = str(args.text_cues).strip()
                if os.path.isfile(raw_cues):
                    try:
                        with open(raw_cues, "r", encoding="utf-8") as f:
                            cues = json.load(f)
                    except Exception as e:
                        print(f"[cmd_export_clip] Failed to parse cues file {raw_cues}: {e}", flush=True)
                else:
                    try:
                        cues = json.loads(raw_cues)
                    except Exception:
                        pass

            if not cues and getattr(args, "vtt", None) and os.path.exists(args.vtt):
                cues = sub.parse_vtt_file(args.vtt)

            if not cues:
                v_path = Path(input_video)
                for ext in [".en.vtt", ".vtt", ".en.srt", ".srt"]:
                    cand = v_path.with_suffix(ext)
                    if cand.exists():
                        cues = sub.parse_vtt_file(str(cand))
                        break
                    cand2 = v_path.parent / f"{v_path.stem}{ext}"
                    if cand2.exists():
                        cues = sub.parse_vtt_file(str(cand2))
                        break

            # If cues are missing, lack word timestamps, or cadence trimming altered the speech timing,
            # transcribe reframed_temp with faster-whisper to guarantee frame-perfect word-level sync.
            has_word_timestamps = any(isinstance(c.get("words"), list) and len(c.get("words")) > 0 for c in cues)
            clip_is_whisper = False
            if getattr(args, "cadence", False) or not cues or not has_word_timestamps:
                try:
                    print("[cmd_export_clip] Generating frame-perfect word timestamps with faster-whisper...", flush=True)
                    whisper_cues = sub.transcribe_with_whisper(str(reframed_temp), language="en")
                    if whisper_cues:
                        cues = whisper_cues
                        clip_is_whisper = True
                except Exception as e:
                    print(f"[cmd_export_clip] Whisper auto-sync note: {e}", flush=True)

            overlay_manifest = None
            if cues:
                clip_offset = 0.0 if (clip_is_whisper or getattr(args, "cadence", False)) else (float(start_time) if start_time is not None else 0.0)
                clip_dur = actual_clip_dur if (actual_clip_dur and actual_clip_dur > 0) else ((float(end_time) - float(start_time)) if (start_time is not None and end_time is not None) else None)

                # Generate Pixel-Identical Live Design Overlay Manifest
                try:
                    live_subs_dir = temp_dir / "live_subs"
                    overlay_manifest = sub.generate_live_overlay_manifest(
                        cues,
                        clip_duration=clip_dur,
                        output_dir=str(live_subs_dir),
                        style_preset=getattr(args, "preset", "tiktok_bold"),
                        clip_start_offset=clip_offset,
                        width=out_w,
                        height=out_h
                    )
                except Exception as e:
                    print(f"[cmd_export_clip] Live overlay generation error ({e}), falling back to ASS", flush=True)

                # Fallback ASS subtitles
                ass_file = temp_dir / "clip_subtitles.ass"
                sub.generate_ass(
                    cues,
                    str(ass_file),
                    style_preset=getattr(args, "preset", "tiktok_bold"),
                    clip_start_offset=clip_offset,
                    clip_duration=clip_dur
                )
                ass_path = str(ass_file)

        # 4. Generate Hook Banner / Social Pill PNG
        banner_path = None
        headline = getattr(args, "headline", "")
        social_handle = getattr(args, "social_handle", None)
        social_platforms = getattr(args, "social_platforms", "tiktok,instagram,youtube")
        social_handles_json = getattr(args, "social_handles_json", None)
        if not getattr(args, "no_banner", False) and (headline or social_handle or social_handles_json):
            on_progress({"phase": "banner", "percent": 75})
            banner_file = temp_dir / "hook_banner.png"
            sub.create_hook_banner(
                headline,
                str(banner_file),
                banner_style=getattr(args, "banner_style", "frosted_gold"),
                width=out_w,
                height=out_h,
                social_pill_text=social_handle,
                social_platforms=social_platforms,
                social_handles_json=social_handles_json
            )
            banner_path = str(banner_file)

        # 5. Audio DSP Options
        audio_dsp_opts = {
            "highpass": getattr(args, "highpass", True),
            "denoise": getattr(args, "denoise", True),
            "loudnorm": getattr(args, "loudnorm", True)
        }

        # 6. Composite into final Master Short
        on_progress({"phase": "compositing", "percent": 80})
        sub.burn_subtitles_and_branding(
            str(reframed_temp),
            output_video,
            ass_path=ass_path,
            subtitle_manifest=overlay_manifest,
            banner_png=banner_path,
            banner_duration=getattr(args, "banner_duration", "first_5s"),
            audio_dsp_options=audio_dsp_opts,
            progress_callback=lambda p: on_progress({"phase": "compositing", "percent": 80.0 + (p.get("percent", 0.0) * 0.18)})
        )

        # 7. Auto-register into clips_queue.json
        try:
            qm = QueueManager()
            file_name = Path(output_video).name
            clean_title = headline or qm._clean_title_from_filename(file_name)
            new_item = {
                "id": Path(output_video).stem,
                "file_path": output_video.replace("\\", "/"),
                "filename": file_name,
                "title": clean_title,
                "caption": f"{clean_title}\\n\\n#Shorts #Reels #TikTok",
                "duration": f"{round(actual_clip_dur)}s" if actual_clip_dur > 0 else (f"{round(float(end_time) - float(start_time))}s" if (start_time is not None and end_time is not None) else "30s"),
                "status": {
                    "youtube": "pending",
                    "instagram": "pending",
                    "tiktok_us": "pending",
                    "tiktok_ng": "pending"
                }
            }
            replaced = False
            for idx, existing in enumerate(qm.items):
                if existing.get("id") == new_item["id"] or existing.get("filename") == file_name:
                    qm.items[idx] = new_item
                    replaced = True
                    break
            if not replaced:
                qm.items.append(new_item)
            qm.save()
        except Exception:
            pass

        # Cleanup temp dir
        shutil.rmtree(temp_dir, ignore_errors=True)

        on_progress({"phase": "completed", "percent": 100.0, "output": output_video})
        if args.json:
            emit_json("export_result", {
                "success": True,
                "output": output_video,
                "aspect": aspect,
                "has_subtitles": bool(ass_path),
                "has_banner": bool(banner_path)
            })
        else:
            print(f"\\nMaster Clip Exported successfully -> {output_video}")

    except Exception as e:
        if args.json:
            emit_json("export_result", {"success": False, "error": str(e), "output": getattr(args, "output", "")})
        else:
            print(f"\\nMaster clip export failed: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    common_parser = argparse.ArgumentParser(add_help=False)
    common_parser.add_argument("--json", action="store_true", help="Output machine-readable JSON events")

    parser = argparse.ArgumentParser(description="hclipper Media Processing & AI Engine", parents=[common_parser])
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Ingest / Download
    p_dl = subparsers.add_parser("download", help="Download video or extract metadata", parents=[common_parser])
    p_dl.add_argument("url", help="Media URL or local file path")
    p_dl.add_argument("--out", help="Output directory")
    p_dl.add_argument("--info", action="store_true", help="Extract metadata only")
    p_dl.add_argument("--no-subs", action="store_true", help="Skip downloading auto-subs")
    p_dl.add_argument("--cookies-from-browser", help="Browser to extract cookies from (chrome, edge, firefox, brave)")
    p_dl.add_argument("--cookies", help="Path to netscape cookies file")
    p_dl.set_defaults(func=cmd_download)

    # Waveform
    p_wf = subparsers.add_parser("waveform", help="Generate waveform peaks for Wavesurfer.js", parents=[common_parser])
    p_wf.add_argument("input", help="Audio or video file")
    p_wf.add_argument("--points", type=int, default=800, help="Number of peak points")
    p_wf.set_defaults(func=cmd_waveform)

    # Trim
    p_tr = subparsers.add_parser("trim", help="Cut range or apply cadence pause trimming", parents=[common_parser])
    p_tr.add_argument("input", help="Source video")
    p_tr.add_argument("output", help="Trimmed output file")
    p_tr.add_argument("--start", type=float, help="Start time in seconds")
    p_tr.add_argument("--end", type=float, help="End time in seconds")
    p_tr.add_argument("--cadence", action="store_true", help="Enable cadence silence trimming")
    p_tr.add_argument("--threshold", default="-33dB", help="Silence threshold")
    p_tr.add_argument("--min-silence", type=float, default=0.75, help="Minimum silence duration")
    p_tr.set_defaults(func=cmd_trim)

    # Reframe
    p_rf = subparsers.add_parser("reframe", help="AI face tracking and aspect ratio reframe", parents=[common_parser])
    p_rf.add_argument("input", help="Horizontal 16:9 input video")
    p_rf.add_argument("output", nargs="?", default="", help="Reframed output video")
    p_rf.add_argument("--model", help="Path to YuNet ONNX model")
    p_rf.add_argument("--aspect", choices=["9:16", "1:1", "16:9"], default="9:16", help="Target aspect ratio")
    p_rf.add_argument("--deadzone", type=float, default=25.0, help="Deadzone leeway in pixels")
    p_rf.add_argument("--smooth", type=float, default=0.06, help="Camera pan smoothing factor")
    p_rf.add_argument("--start", type=float, help="Start timestamp in seconds")
    p_rf.add_argument("--end", type=float, help="End timestamp in seconds")
    p_rf.add_argument("--trajectory-only", action="store_true", help="Calculate crop coordinates only")
    p_rf.set_defaults(func=cmd_reframe)

    # Subtitles
    p_sb = subparsers.add_parser("subtitles", help="Generate styled ASS subtitles", parents=[common_parser])
    p_sb.add_argument("input", nargs="?", default="", help="Audio or video file")
    p_sb.add_argument("output", help="Output .ass file")
    p_sb.add_argument("--vtt", help="Pre-existing WebVTT subtitle file")
    p_sb.add_argument("--model-size", default="base", help="Whisper model size")
    p_sb.add_argument("--preset", default="tiktok_bold", help="Subtitle style preset")
    p_sb.set_defaults(func=cmd_subtitles)

    # Hook Banner
    p_bn = subparsers.add_parser("banner", help="Generate frosted hook banner PNG", parents=[common_parser])
    p_bn.add_argument("title", help="Hook headline text")
    p_bn.add_argument("output", help="Output PNG path")
    p_bn.add_argument("--style", default="frosted_gold", choices=["frosted_gold", "cyber_neon", "clean_minimal", "viral_warning"], help="Banner visual style preset")
    p_bn.set_defaults(func=cmd_banner)

    # Audio Master
    p_ad = subparsers.add_parser("master", help="Broadcast vocal DSP and background music ducking", parents=[common_parser])
    p_ad.add_argument("input", help="Input video or audio")
    p_ad.add_argument("output", help="Mastered output media")
    p_ad.add_argument("--music", help="Background music audio file")
    p_ad.add_argument("--music-vol", type=float, default=0.08, help="Music volume factor")
    p_ad.add_argument("--duration", type=float, help="Total media duration")
    p_ad.set_defaults(func=cmd_master_audio)

    # Publisher
    p_pb = subparsers.add_parser("publish", help="Manage social publishing queue", parents=[common_parser])
    p_pb.add_argument("--scan", action="store_true", help="Scan clips directory")
    p_pb.add_argument("--list", action="store_true", help="List queued clips")
    p_pb.add_argument("--publish", help="Publish range (e.g. 1-6)")
    p_pb.add_argument("--platforms", default="ig,tt_ng,yt", help="Comma-separated platforms")
    p_pb.set_defaults(func=cmd_publish)

    # Login
    p_lg = subparsers.add_parser("login", help="Launch interactive browser login", parents=[common_parser])
    p_lg.add_argument("--platform", required=True, choices=["youtube", "tiktok", "tiktok_ng", "instagram"], help="Target platform")
    p_lg.set_defaults(func=cmd_login)

    # Session Status
    p_ss = subparsers.add_parser("session-status", help="Check session login status", parents=[common_parser])
    p_ss.set_defaults(func=cmd_session_status)

    # Discovered Browser Profiles
    p_bp = subparsers.add_parser("browser-profiles", help="List discovered Chrome & Edge user profiles and channels", parents=[common_parser])
    p_bp.set_defaults(func=cmd_browser_profiles)

    # Open Studio in authentic System Browser
    p_obs = subparsers.add_parser("open-studio", help="Launch authentic system browser with selected profile", parents=[common_parser])
    p_obs.add_argument("--browser", default="chrome", choices=["chrome", "edge"], help="Target system browser")
    p_obs.add_argument("--profile", default="Default", help="Browser user profile ID (e.g. Default, Profile 3)")
    p_obs.add_argument("--url", default="https://studio.youtube.com", help="Target URL to navigate to")
    p_obs.set_defaults(func=cmd_open_browser_studio)

    # Highlights (BYOK AI Viral Clip Scout)
    p_hl = subparsers.add_parser("highlights", help="Scout viral short clip moments from transcripts", parents=[common_parser])
    p_hl.add_argument("--input", help="Transcript text or subtitle file")
    p_hl.add_argument("--text", help="Raw transcript text")
    p_hl.add_argument("--video", help="Path to source video file")
    p_hl.add_argument("--count", type=int, default=5, help="Number of clips to generate (e.g. 3, 5, 8, 10)")
    p_hl.add_argument("--duration", choices=["story", "short", "standard", "long"], default="story", help="Target clip duration range")
    p_hl.add_argument("--provider", default="gemini", choices=["gemini", "groq", "deepseek", "xai", "grok", "openai", "anthropic", "claude", "kimi", "local", "ollama"], help="AI provider")
    p_hl.add_argument("--api-key", help="API key for selected provider")
    p_hl.add_argument("--model", help="Custom model identifier")
    p_hl.set_defaults(func=cmd_highlights)
    # Motion Design (Dynamic Multi-Cue Animation & SFX)
    p_mo = subparsers.add_parser("motion", help="Render bespoke dynamic motion design overlay and SFX", parents=[common_parser])
    p_mo.add_argument("input", help="Source video")
    p_mo.add_argument("output", help="Output video path")
    p_mo.add_argument("--headline", help="Hook headline text")
    p_mo.add_argument("--speaker", help="Speaker name")
    p_mo.add_argument("--topic", help="Topic or sermon title")
    p_mo.add_argument("--template", default="kinetic_hook.html", help="Motion template name")
    p_mo.add_argument("--vtt", help="Path to WebVTT/SRT file")
    p_mo.add_argument("--text-cues", help="JSON encoded transcript cues")
    p_mo.add_argument("--custom-cues", help="JSON encoded custom motion cues (HyperFrames + Collage)")
    p_mo.add_argument("--preset", default="tiktok_bold", help="Subtitle animation style preset")
    p_mo.add_argument("--no-subs", action="store_true", help="Omit subtitles")
    p_mo.set_defaults(func=cmd_motion)

    # Master Short Export (Full pipeline: reframe + subtitles + hook banner + audio DSP)
    p_ec = subparsers.add_parser("export-clip", help="Render finished master short with reframing, captions, hook banner, and audio DSP", parents=[common_parser])
    p_ec.add_argument("input", help="Source video")
    p_ec.add_argument("output", help="Output master video path")
    p_ec.add_argument("--start", type=float, help="Start timestamp in seconds")
    p_ec.add_argument("--end", type=float, help="End timestamp in seconds")
    p_ec.add_argument("--aspect", choices=["9:16", "1:1", "16:9"], default="9:16", help="Target aspect ratio")
    p_ec.add_argument("--deadzone", type=float, default=25.0, help="Camera deadzone leeway")
    p_ec.add_argument("--smooth", type=float, default=0.06, help="Camera pan smoothing factor")
    p_ec.add_argument("--headline", default="", help="Hook banner headline text")
    p_ec.add_argument("--banner-style", default="frosted_gold", choices=["frosted_gold", "cyber_neon", "clean_minimal", "viral_warning", "kinetic_spring"], help="Banner visual style")
    p_ec.add_argument("--banner-duration", default="first_5s", choices=["first_3s", "first_5s", "full_clip"], help="Banner on-screen duration")
    p_ec.add_argument("--no-banner", action="store_true", help="Omit top hook banner")
    p_ec.add_argument("--social-handle", help="Social handle text for bottom badge")
    p_ec.add_argument("--social-platforms", default="tiktok,instagram,youtube", help="Comma-separated platform icons to render (e.g. tiktok,instagram,youtube)")
    p_ec.add_argument("--social-handles-json", help="JSON encoded structured social handle capsules")
    p_ec.add_argument("--preset", default="tiktok_bold", choices=["tiktok_bold", "dynamic_pop", "clean_white"], help="Subtitle animation style preset")
    p_ec.add_argument("--no-subs", action="store_true", help="Omit subtitles")
    p_ec.add_argument("--vtt", help="Path to WebVTT/SRT file")
    p_ec.add_argument("--text-cues", help="JSON encoded transcript cues")
    p_ec.add_argument("--highpass", action="store_true", default=True, help="Enable 80Hz rumble highpass")
    p_ec.add_argument("--denoise", action="store_true", default=True, help="Enable FFT noise reduction")
    p_ec.add_argument("--loudnorm", action="store_true", default=True, help="Enable -14 LUFS loudness mastering")
    p_ec.add_argument("--cadence", action="store_true", help="Enable cadence silence trimming")
    p_ec.add_argument("--threshold", default="-33dB", help="Cadence silence threshold")
    p_ec.add_argument("--min-silence", type=float, default=0.75, help="Minimum silence duration")
    p_ec.set_defaults(func=cmd_export_clip)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
