// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

// Self-update check for the methodology-m CLI.
//
// Pattern adapted from textologylabs/hex (src/update.ts). Runs at the top
// of operational CLI commands; respects M_NO_UPDATE_CHECK=1 and non-TTY
// environments. If a newer version is published on npm, prompts the user
// to upgrade via `npm i -g methodology-m@latest` and relaunches with the
// original args.

import { spawn } from 'node:child_process';
import readline from 'node:readline';
import { readAvailableVersion } from './version-file.mjs';

const PKG_NAME = 'methodology-m';
const REGISTRY = 'https://registry.npmjs.org';
const FETCH_TIMEOUT_MS = 2000;

export async function maybeUpdate() {
  if (!shouldCheck()) return;

  const current = readAvailableVersion();
  const latest = await fetchLatestVersion(current);
  if (!latest || compareVersions(latest, current) <= 0) return;

  console.log(`▲ methodology-m v${latest} is available — you have v${current}.`);
  const yes = await confirm('Update now?');
  if (!yes) return;

  const ok = await runInstall();
  if (!ok) {
    console.error('Update failed. Continuing with current version.');
    return;
  }

  await relaunch();
}

function shouldCheck() {
  if (process.env.M_NO_UPDATE_CHECK === '1') return false;
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  return true;
}

async function fetchLatestVersion(currentVersion) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(`${REGISTRY}/${PKG_NAME}/latest`, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': `methodology-m/${currentVersion}`,
        accept: 'application/json',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.version ?? null;
  } catch {
    return null;
  }
}

export function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`${question} (y/N) `, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

function runInstall() {
  return new Promise((resolve) => {
    const child = spawn('npm', ['i', '-g', `${PKG_NAME}@latest`], {
      stdio: 'inherit',
      shell: false,
    });
    child.on('exit', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

function relaunch() {
  const args = process.argv.slice(2);
  return new Promise((_, reject) => {
    const child = spawn('m', args, { stdio: 'inherit', shell: false });
    child.on('exit', (code) => process.exit(code ?? 0));
    child.on('error', reject);
  });
}
