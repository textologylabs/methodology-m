#!/usr/bin/env node

// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

const command = process.argv[2];
const args = process.argv.slice(3);

const HELP = `
  methodology-m — inject and manage Methodology M in your project

  Usage:
    m init                   Set up M in the current project (root repo)
    m clone <url> [--ide X]  Clone root + all managed repos into a workspace
    m clone [--ide X]        (from inside root repo) Clone missing siblings
    m update [version]       Upgrade M to a new version
    m diff                   Show changes between installed and available M
    m version                Show installed, bundled, and latest versions
    m changelog [version]    Show changelog (optionally for a specific version)
    m help                   Show this help

  Starting a new M project?   Run "m init" in your root repo.
  Joining an existing project? Run "m clone <root-repo-url>".

  Options:
    --ide vscode             IDE workspace format (default: vscode)
`;

async function main() {
  switch (command) {
    case 'init': {
      const { init } = await import('../src/commands/init.mjs');
      await init(args);
      break;
    }
    case 'clone': {
      const { clone } = await import('../src/commands/clone.mjs');
      await clone(args);
      break;
    }
    case 'update': {
      const { update } = await import('../src/commands/update.mjs');
      await update(args);
      break;
    }
    case 'diff': {
      const { diff } = await import('../src/commands/diff.mjs');
      await diff(args);
      break;
    }
    case 'version': {
      const { version } = await import('../src/commands/version.mjs');
      await version(args);
      break;
    }
    case 'changelog': {
      const { changelog } = await import('../src/commands/changelog.mjs');
      await changelog(args);
      break;
    }
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
