import asyncio
import json
import os
import subprocess
import edge_tts

VOICE = "en-US-AndrewMultilingualNeural"
OUT_DIR = "d:/MyApp/RepoMedic/public/demo-assets/audio"
os.makedirs(OUT_DIR, exist_ok=True)

CHAPTERS = [
    {
        "id": "chapter1",
        "title": "Problem Statement",
        "rate": "+8%",
        "text": (
            "When a critical exception hits production at three A.M., engineering teams face a forty-five minute bottleneck. "
            "Developers scramble to reproduce the exact failing commit and isolate edge-case bugs, "
            "while standard AI coding assistants hallucinate unverified patches that nobody dares to merge without proof."
        ),
    },
    {
        "id": "chapter2",
        "title": "The Idea: RepoMedic",
        "rate": "+8%",
        "text": (
            "Meet RepoMedic: Diagnose. Patch. Prove. "
            "RepoMedic is an autonomous, closed-loop production incident investigator. "
            "It pins the failing repository commit, reproduces the failure in an isolated sandbox, synthesizes a minimal patch, "
            "and proves the identical test command turns from red to green."
        ),
    },
    {
        "id": "chapter3",
        "title": "Technologies Used",
        "rate": "+8%",
        "text": (
            "RepoMedic is powered by NVIDIA Nemotron Three Super One-Twenty-B on Nebius Token Factory across four reasoning stages. "
            "It integrates Nebius Token Factory Sandboxes via the ConTree Copy-on-Write SDK, Vercel Sandbox micro-VMs, "
            "LangSmith six-span trace trees and online evaluators, Tavily live specification grounding, and Supabase Postgres with row-level security."
        ),
    },
    {
        "id": "chapter4",
        "title": "Live App Walkthrough: Triage & Proof of Fix",
        "rate": "+8%",
        "text": (
            "Inside the Apple Cupertino-inspired interface, judges sign in with one click or register with automated Resend welcome emails. "
            "Inspecting a B2B checkout bug where a zero-percent tax rate was overridden by an eight-point-five percent default, "
            "RepoMedic localizes pricing dot T-S line forty-four, replaces logical OR with nullish coalescing, and turns exit code one into exit code zero."
        ),
    },
    {
        "id": "chapter5",
        "title": "Nebius Sandboxes, LangSmith & Co-Pilot",
        "rate": "+8%",
        "text": (
            "Every patch passes a six-check static security and blast-radius scanner scoring one hundred out of one hundred. "
            "With one click, RepoMedic runs a three-step Copy-on-Write container verification in Nebius Token Factory Sandboxes with ANSI QR attestation, "
            "streams a six-span trace waterfall and four evaluator scores to LangSmith, and powers an Episodic Memory and Tavily Co-Pilot."
        ),
    },
    {
        "id": "chapter6",
        "title": "How RepoMedic Solves the Problem & Impact",
        "rate": "+8%",
        "text": (
            "Finally, RepoMedic enforces a cryptographic SHA-256 human approval gate before opening an idempotent GitHub Draft Pull Request, "
            "while admins monitor global Nebius telemetry and RBAC in the Admin Control Plane. "
            "RepoMedic compresses incident recovery from forty-five minutes to eighteen seconds—a ninety-nine point three percent reduction in mean time to resolution."
        ),
    },
]


def get_duration(file_path: str) -> float:
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        file_path,
    ]
    out = subprocess.check_output(cmd, text=True).strip()
    return float(out)


async def synth_with_retry(text: str, voice: str, rate: str, out_path: str):
    for attempt in range(5):
        try:
            comm = edge_tts.Communicate(text, voice, rate=rate)
            await comm.save(out_path)
            if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
                return
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}, retrying in 2s...")
            await asyncio.sleep(2.0)
    raise RuntimeError(f"Failed to synthesize {out_path}")


async def main():
    manifest = []
    total_dur = 0.0
    for ch in CHAPTERS:
        mp3_path = os.path.join(OUT_DIR, f"{ch['id']}.mp3")
        await synth_with_retry(ch["text"], VOICE, ch["rate"], mp3_path)
        await asyncio.sleep(0.8)
        dur = get_duration(mp3_path)
        total_dur += dur
        manifest.append(
            {
                "id": ch["id"],
                "title": ch["title"],
                "mp3": mp3_path,
                "durationSec": round(dur, 3),
            }
        )
        print(f"{ch['id']} ({ch['title']}): {dur:.2f}s")

    print(f"TOTAL VOICEOVER DURATION: {total_dur:.2f}s")
    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"totalDurationSec": round(total_dur, 3), "chapters": manifest}, f, indent=2)


if __name__ == "__main__":
    asyncio.run(main())
