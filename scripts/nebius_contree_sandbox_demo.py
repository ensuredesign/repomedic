#!/usr/bin/env python3
"""
RepoMedic × Nebius Token Factory Sandboxes (Beta) (`contree-sdk`) Live Runner
Docs: https://docs.tokenfactory.nebius.com/sandboxes/overview

Usage:
  pip install contree-sdk
  export NEBIUS_API_KEY="v1...."
  export NEBIUS_PROJECT_ID="aiproject-e00am2xdmcyzgvf9s5"
  python scripts/nebius_contree_sandbox_demo.py
"""

from contree_sdk import ContreeSync


def run_nebius_sandbox_verification(
    proof_url: str = "https://tokenfactory.nebius.com",
) -> None:
    client = ContreeSync()
    # Use a stateful Copy-on-Write (CoW) session so apt-get changes persist across steps
    sandbox = client.images.use("python:3.12-slim").session()

    print("[1/3] Updating apt package index inside Nebius Token Factory Sandbox (python:3.12-slim)...")
    sandbox.run("apt-get", args=["update", "-q"], disposable=False).wait()

    print("[2/3] Installing system tool 'qrencode' into Copy-on-Write image layer...")
    sandbox.run("apt-get", args=["install", "-y", "qrencode"], disposable=False).wait()

    generated_code = f"""
import hashlib
import json
import subprocess

# 1. Verify RepoMedic B2B 0% Tax-Exempt Patch Invariant inside Nebius Sandbox
def resolve_tax_rate_buggy(tax_rate_percent, default_rate=8.5):
    return tax_rate_percent or default_rate

def resolve_tax_rate_patched(tax_rate_percent, default_rate=8.5):
    return default_rate if tax_rate_percent is None else tax_rate_percent

baseline_b2b = resolve_tax_rate_buggy(0.0)
patched_b2b = resolve_tax_rate_patched(0.0)
assert baseline_b2b == 8.5, "Baseline reproduced 8.5% tax bug on 0% B2B order"
assert patched_b2b == 0.0, "Patched function preserved explicit 0% B2B tax rate"

# 2. Generate ANSI UTF-8 QR Code via system tool 'qrencode'
qr = subprocess.run(
    ["qrencode", "-t", "ANSIUTF8", "{proof_url}"],
    capture_output=True,
    text=True,
    check=True,
)
print("=== NEBIUS TOKEN FACTORY SANDBOX (CONTREE-SDK) VERIFIED ===")
print(json.dumps({{
    "engine": "Nebius Token Factory Sandboxes (Beta) / contree-sdk",
    "base_image": "python:3.12-slim",
    "system_tool_installed": "qrencode",
    "baseline_b2b_tax": baseline_b2b,
    "patched_b2b_tax": patched_b2b,
    "status": "VERIFIED_EXIT_0"
}}))
print(qr.stdout)
"""

    print("[3/3] Executing model-generated verification & qrencode script...")
    result = sandbox.run("python", args=["-c", generated_code]).wait()
    print(result.stdout)


if __name__ == "__main__":
    run_nebius_sandbox_verification()
