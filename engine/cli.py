"""
hclipper Unified Command Line Interface
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CLI entry point for running individual pipeline modules or the full end-to-end
media processing pipeline headless. Supports JSON-RPC stdout output for Electron IPC.
"""

import sys
import os
import json
import argparse
from pathlib import Path

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
    print(f"__HCLIPPER_JSON__{json.dumps(payload, ensure_ascii=False)}", flush=True)

def cmd_download(args):
    downloader = MediaDownloader(download_dir=args.out)
    if args.info:
        info = downloader.extract_info(args.url)
        if args.json:
            emit_json("info", info)
        else:
            print(json.dumps(info, indent=2))
        return

    def on_progress(d):
        if args.json:
            emit_json("progress", d)
        else:
            pct = d.get("percent", 0)
            status = d.get("status", "")
            print(f"[{status}] {pct}%", end="\r", flush=True)

    result = downloader.download(
        args.url,
        download_subs=not args.no_subs,
        progress_callback=on_progress
    )
    if args.json:
        emit_json("result", result)
    else:
        print("\nDownload finished:", result["video_path"])

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
        res = trimmer.cadence_silence_trim(
            args.input,
            args.output,
            noise_threshold=args.threshold,
            min_silence=args.min_silence
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
    def on_progress(p):
        if args.json:
            emit_json("reframe_progress", p)
        else:
            print(f"[{p.get('phase')}] {p.get('percent')}%", end="\r", flush=True)

    if args.trajectory_only:
        traj = reframer.compute_crop_trajectory(args.input, progress_callback=on_progress)
        if args.json:
            emit_json("trajectory", traj)
        else:
            print(f"\nTrajectory calculated: {traj['total_frames']} frames")
        return

    res = reframer.render_reframed_video(
        args.input,
        args.output,
        progress_callback=on_progress
    )
    if args.json:
        emit_json("reframe_result", {"success": res, "output": args.output})
    else:
        print("\nAuto-reframe render completed:", args.output)

def cmd_subtitles(args):
    sub = SubtitleEngine()
    if args.vtt:
        cues = sub.parse_vtt_file(args.vtt)
    else:
        print("Transcribing with Whisper...")
        cues = sub.transcribe_with_whisper(args.input, model_size=args.model_size)

    ass_path = sub.generate_ass(cues, args.output, style_preset=args.preset)
    if args.json:
        emit_json("subtitles_result", {"ass_file": ass_path, "cues_count": len(cues)})
    else:
        print(f"Generated ASS subtitles at {ass_path} ({len(cues)} cues)")

def cmd_banner(args):
    sub = SubtitleEngine()
    banner_path = sub.create_hook_banner(args.title, args.output)
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

        def progress_cb(clip_id, platform, status, pct):
            if args.json:
                emit_json("publish_progress", {
                    "clip_id": clip_id,
                    "platform": platform,
                    "status": status,
                    "progress": pct
                })
            else:
                print(f"[{pct}%] {clip_id} -> {platform}: {status}")

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

def cmd_session_status(args):
    publisher = SocialPublisher()
    status = publisher.check_session_status()
    if args.json:
        emit_json("session_status", status)
    else:
        print(json.dumps(status, indent=2))

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
    p_rf = subparsers.add_parser("reframe", help="AI face tracking and 9:16 vertical crop", parents=[common_parser])
    p_rf.add_argument("input", help="Horizontal 16:9 input video")
    p_rf.add_argument("output", nargs="?", default="", help="Vertical 9:16 output video")
    p_rf.add_argument("--model", help="Path to YuNet ONNX model")
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

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
