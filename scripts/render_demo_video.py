import json
import os
import subprocess

FFMPEG = "ffmpeg"
FFPROBE = "ffprobe"

BASE_DIR = "d:/MyApp/RepoMedic/public/demo-assets"
SLIDES_DIR = os.path.join(BASE_DIR, "slides")
AUDIO_DIR = os.path.join(BASE_DIR, "audio")
TEMP_DIR = os.path.join(BASE_DIR, "temp_clips")
os.makedirs(TEMP_DIR, exist_ok=True)

OUT_PUBLIC_MP4 = "d:/MyApp/RepoMedic/public/demo-assets/repomedic-hackathon-demo-2min.mp4"
OUT_ROOT_MP4 = "d:/MyApp/RepoMedic/repomedic-hackathon-demo-2min.mp4"


def get_duration(file_path: str) -> float:
    cmd = [
        FFPROBE,
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        file_path,
    ]
    return float(subprocess.check_output(cmd, text=True).strip())


def prepare_chapter_audio(src_mp3: str, dst_wav: str, atempo: float = 1.14) -> float:
    # Speed up slightly with pitch-preserving atempo so total 6-chapter video is ~120.0s (2 minutes)
    cmd = [
        FFMPEG,
        "-y",
        "-i",
        src_mp3,
        "-filter:a",
        f"atempo={atempo:.4f},aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo",
        dst_wav,
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return get_duration(dst_wav)


def render_beat_clip(image_path: str, duration: float, out_mp4: str, mode: str = "zoom_in"):
    fps = 30
    frames = max(30, int(round(duration * fps)))
    # High-precision smooth 1080p animation with ZERO bottom text captions
    if mode == "zoom_in":
        vf = (
            f"scale=2240:1260:force_original_aspect_ratio=increase,crop=2240:1260,"
            f"zoompan=z='min(zoom+0.00045,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1920x1080:fps={fps},"
            f"fade=t=in:st=0:d=0.45,fade=t=out:st={max(0.1, duration - 0.45):.2f}:d=0.45,format=yuv420p"
        )
    elif mode == "zoom_out":
        vf = (
            f"scale=2240:1260:force_original_aspect_ratio=increase,crop=2240:1260,"
            f"zoompan=z='if(eq(on,1),1.08,max(1.0,zoom-0.00045))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1920x1080:fps={fps},"
            f"fade=t=in:st=0:d=0.45,fade=t=out:st={max(0.1, duration - 0.45):.2f}:d=0.45,format=yuv420p"
        )
    else:
        # Smooth pan across UI screen
        vf = (
            f"scale=2160:1215:force_original_aspect_ratio=increase,crop=2160:1215,"
            f"zoompan=z='1.04':x='(iw-iw/zoom)*(on/{frames})':y='(ih-ih/zoom)*(on/{frames})':d={frames}:s=1920x1080:fps={fps},"
            f"fade=t=in:st=0:d=0.4,fade=t=out:st={max(0.1, duration - 0.4):.2f}:d=0.4,format=yuv420p"
        )

    cmd = [
        FFMPEG,
        "-y",
        "-loop",
        "1",
        "-i",
        image_path,
        "-vf",
        vf,
        "-t",
        f"{duration:.3f}",
        "-r",
        str(fps),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        out_mp4,
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    print("Preparing 6-chapter voiceover tracks for exact 2-minute (120s) runtime...")
    chapter_SCENES = {
        "chapter1": [
            ("scene1-problem.jpg", 0.52, "zoom_in"),
            ("01-landing-hero.png", 0.48, "pan"),
        ],
        "chapter2": [
            ("scene2-idea.jpg", 0.52, "zoom_out"),
            ("02-landing-workflow.png", 0.48, "pan"),
        ],
        "chapter3": [
            ("scene3-tech-stack.jpg", 0.45, "zoom_in"),
            ("02b-landing-pillars.png", 0.28, "pan"),
            ("05-new-incident-ingestion.png", 0.27, "zoom_in"),
        ],
        "chapter4": [
            ("03-auth-portal.png", 0.26, "zoom_in"),
            ("04-dashboard-command-center.png", 0.26, "pan"),
            ("06-proof-5stage-pipeline.png", 0.24, "pan"),
            ("07-proof-diff-and-sandbox.png", 0.24, "zoom_in"),
        ],
        "chapter5": [
            ("07b-security-scanner.png", 0.22, "pan"),
            ("08-proof-nebius-contree-sandbox.png", 0.30, "zoom_in"),
            ("09-proof-langsmith-trace.png", 0.26, "pan"),
            ("10-proof-copilot-and-tavily.png", 0.22, "zoom_out"),
        ],
        "chapter6": [
            ("11-admin-control-plane.png", 0.46, "pan"),
            ("scene6-impact.jpg", 0.54, "zoom_in"),
        ],
    }

    raw_total = sum(
        get_duration(os.path.join(AUDIO_DIR, f"chapter{i}.mp3")) for i in range(1, 7)
    )
    target_total = 119.5
    atempo = max(1.0, min(1.25, raw_total / target_total))
    print(f"Raw voiceover sum: {raw_total:.2f}s -> Applying atempo={atempo:.4f} for ~120.0s target")

    chapter_mp4s = []
    for idx in range(1, 7):
        ch_id = f"chapter{idx}"
        ch_muxed = os.path.join(TEMP_DIR, f"{ch_id}_muxed.mp4")
        if os.path.exists(ch_muxed) and os.path.getsize(ch_muxed) > 50000:
            print(f"Reusing already rendered {ch_id} ({get_duration(ch_muxed):.2f}s)...")
            chapter_mp4s.append(ch_muxed)
            continue

        src_mp3 = os.path.join(AUDIO_DIR, f"{ch_id}.mp3")
        wav_path = os.path.join(TEMP_DIR, f"{ch_id}.wav")
        ch_dur = prepare_chapter_audio(src_mp3, wav_path, atempo=atempo)
        print(f"Rendering {ch_id} ({ch_dur:.2f}s)...")

        beats = chapter_SCENES[ch_id]
        beat_files = []
        used_dur = 0.0
        for b_idx, (img_name, weight, mode) in enumerate(beats):
            if b_idx == len(beats) - 1:
                b_dur = max(1.0, ch_dur - used_dur)
            else:
                b_dur = round(ch_dur * weight, 3)
                used_dur += b_dur

            img_path = os.path.join(SLIDES_DIR, img_name)
            beat_mp4 = os.path.join(TEMP_DIR, f"{ch_id}_beat{b_idx}.mp4")
            render_beat_clip(img_path, b_dur, beat_mp4, mode=mode)
            beat_files.append(beat_mp4)

        # Concatenate beats for this chapter
        concat_txt = os.path.join(TEMP_DIR, f"{ch_id}_beats.txt")
        with open(concat_txt, "w", encoding="utf-8") as f:
            for bf in beat_files:
                f.write(f"file '{bf.replace(os.sep, '/')}'\n")

        ch_video_only = os.path.join(TEMP_DIR, f"{ch_id}_v.mp4")
        subprocess.run(
            [
                FFMPEG,
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                concat_txt,
                "-c",
                "copy",
                ch_video_only,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        # Mux chapter video + chapter audio
        ch_muxed = os.path.join(TEMP_DIR, f"{ch_id}_muxed.mp4")
        subprocess.run(
            [
                FFMPEG,
                "-y",
                "-i",
                ch_video_only,
                "-i",
                wav_path,
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-shortest",
                ch_muxed,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        chapter_mp4s.append(ch_muxed)

    # Concatenate all 6 chapters into final master MP4 + subtle ambient keynote bed
    all_txt = os.path.join(TEMP_DIR, "all_chapters.txt")
    with open(all_txt, "w", encoding="utf-8") as f:
        for cm in chapter_mp4s:
            f.write(f"file '{cm.replace(os.sep, '/')}'\n")

    raw_master = os.path.join(TEMP_DIR, "raw_master.mp4")
    subprocess.run(
        [
            FFMPEG,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            all_txt,
            "-c",
            "copy",
            raw_master,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    final_dur = get_duration(raw_master)
    print(f"Mastering final 1080p video with subtle studio ambient chord bed ({final_dur:.2f}s)...")

    # Add warm C-major9 ambient pad at -28dB under the voiceover and normalize
    subprocess.run(
        [
            FFMPEG,
            "-y",
            "-i",
            raw_master,
            "-f",
            "lavfi",
            "-i",
            f"aevalsrc='0.018*sin(2*PI*130.81*t)+0.014*sin(2*PI*196.00*t)+0.012*sin(2*PI*246.94*t)+0.010*sin(2*PI*293.66*t)':s=44100:d={final_dur:.2f}",
            "-filter_complex",
            "[1:a]afade=t=in:st=0:d=2.0,afade=t=out:st="
            + f"{max(1.0, final_dur - 2.5):.2f}"
            + ":d=2.5[pad];[0:a][pad]amix=inputs=2:duration=first:dropout_transition=2,loudnorm=I=-16:TP=-1.5:LRA=11[aout]",
            "-map",
            "0:v",
            "-map",
            "[aout]",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            OUT_PUBLIC_MP4,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    # Copy to root and artifact directory
    import shutil

    shutil.copyfile(OUT_PUBLIC_MP4, OUT_ROOT_MP4)
    print(f"SUCCESS! Final 1080p Demo Video rendered: {OUT_PUBLIC_MP4} ({get_duration(OUT_PUBLIC_MP4):.2f}s)")


if __name__ == "__main__":
    main()
