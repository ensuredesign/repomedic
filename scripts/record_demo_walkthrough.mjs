import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://repomedic-eta.vercel.app';
const SLIDES_DIR = 'd:/MyApp/RepoMedic/public/demo-assets/slides';
const RAW_VIDEO_DIR = 'd:/MyApp/RepoMedic/public/demo-assets/raw-video';

fs.mkdirSync(SLIDES_DIR, { recursive: true });
fs.mkdirSync(RAW_VIDEO_DIR, { recursive: true });

async function injectSmoothCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.style.cssText = `
      width: 22px;
      height: 22px;
      border: 2.5px solid #0071E3;
      background: rgba(0, 113, 227, 0.22);
      box-shadow: 0 0 18px rgba(0, 113, 227, 0.45);
      border-radius: 50%;
      position: fixed;
      pointer-events: none;
      z-index: 999999;
      transition: transform 0.15s ease, left 0.25s cubic-bezier(0.22,1,0.36,1), top 0.25s cubic-bezier(0.22,1,0.36,1);
      transform: translate(-50%, -50%);
      left: 960px;
      top: 540px;
    `;
    document.body.appendChild(cursor);
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });
    document.addEventListener('mousedown', () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(0.75)';
      cursor.style.background = 'rgba(48, 209, 88, 0.45)';
    });
    document.addEventListener('mouseup', () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(1)';
      cursor.style.background = 'rgba(0, 113, 227, 0.22)';
    });
  });
}

async function smoothScrollTo(page, yTarget, durationMs = 900) {
  await page.evaluate(
    async ({ y, dur }) => {
      const startY = window.scrollY;
      const diff = y - startY;
      const startTime = performance.now();
      await new Promise((resolve) => {
        function step(now) {
          const t = Math.min(1, (now - startTime) / dur);
          const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          window.scrollTo(0, startY + diff * ease);
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        }
        requestAnimationFrame(step);
      });
    },
    { y: yTarget, dur: durationMs },
  );
}

async function main() {
  console.log('Launching Chromium 1920x1080 walkthrough capture...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: RAW_VIDEO_DIR,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  // 1. Landing Page Hero
  console.log('1. Capturing Landing Page Hero...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 45000 });
  await injectSmoothCursor(page);
  await page.mouse.move(1280, 420, { steps: 18 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SLIDES_DIR, '01-landing-hero.png') });

  // 2. Landing Page 5-Stage Workflow & 4-Pillar Rubric
  console.log('2. Capturing Landing Page Workflow & Architecture...');
  await smoothScrollTo(page, 680, 900);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SLIDES_DIR, '02-landing-workflow.png') });

  await smoothScrollTo(page, 1450, 900);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SLIDES_DIR, '02b-landing-pillars.png') });

  // 3. Interactive Case Study & Proof of Fix (/demo)
  console.log('3. Capturing Interactive Case Study (/demo)...');
  await page.goto(`${BASE_URL}/demo`, { waitUntil: 'networkidle', timeout: 45000 });
  await injectSmoothCursor(page);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(SLIDES_DIR, '06-proof-5stage-pipeline.png') });

  // Scroll to Proof of Fix Red vs Green + Unified Diff + Security Audit
  await smoothScrollTo(page, 760, 900);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SLIDES_DIR, '07-proof-diff-and-sandbox.png') });

  // Scroll to Security Audit & Diff
  await smoothScrollTo(page, 1320, 900);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SLIDES_DIR, '07b-security-scanner.png') });

  // Scroll to Nebius Token Factory Sandboxes (contree-sdk) section
  const nebiusSec = page.locator('#nebius-sandbox-section');
  if ((await nebiusSec.count()) > 0) {
    await nebiusSec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SLIDES_DIR, '08-proof-nebius-contree-sandbox.png') });
  }

  // Scroll to LangSmith 6-Span Trace Tree & Online Evaluators section
  const lsSec = page.locator('#langsmith-trace-section');
  if ((await lsSec.count()) > 0) {
    await lsSec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SLIDES_DIR, '09-proof-langsmith-trace.png') });
  }

  // Scroll to Persistent Episodic Memory & Tavily Co-Pilot
  await smoothScrollTo(page, 3100, 900);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(SLIDES_DIR, '10-proof-copilot-and-tavily.png') });

  // 4. Auth Portal (/auth) -> 1-Click Judge Login -> Command Center (/app)
  console.log('4. Capturing Auth Portal & 1-Click Login...');
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle', timeout: 45000 });
  await injectSmoothCursor(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SLIDES_DIR, '03-auth-portal.png') });

  const userLoginBtn = page.locator('#demo-user-login-button');
  if ((await userLoginBtn.count()) > 0) {
    await userLoginBtn.click();
    await page.waitForURL('**/app**', { timeout: 25000 }).catch(() => null);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: path.join(SLIDES_DIR, '04-dashboard-command-center.png') });
  }

  // 5. New Incident Ingestion (/app/incidents/new)
  console.log('5. Capturing New Incident Ingestion (/app/incidents/new)...');
  await page.goto(`${BASE_URL}/app/incidents/new`, { waitUntil: 'networkidle', timeout: 45000 });
  await injectSmoothCursor(page);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SLIDES_DIR, '05-new-incident-ingestion.png') });

  // 6. Admin Control Plane (/admin) via 1-Click Admin Login
  console.log('6. Capturing Admin Control Plane (/admin)...');
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle', timeout: 45000 });
  const adminLoginBtn = page.locator('#demo-admin-login-button');
  if ((await adminLoginBtn.count()) > 0) {
    await adminLoginBtn.click();
    await page.waitForURL('**/admin**', { timeout: 25000 }).catch(() => null);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(SLIDES_DIR, '11-admin-control-plane.png') });
  }

  const videoPath = await page.video()?.path();
  await context.close();
  await browser.close();
  console.log('Walkthrough capture complete! Raw video:', videoPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
