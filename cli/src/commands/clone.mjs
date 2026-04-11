import { existsSync, mkdirSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { readTopology, getReferencedRepos } from '../lib/topology.mjs';
import { generateWorkspace } from '../lib/workspace.mjs';

/**
 * m clone <root-repo-url> [--ide vscode]
 * m clone                  (run from inside an existing root repo)
 */
export async function clone(args) {
  const flags = parseFlags(args);
  const ide = flags.ide || 'vscode';

  if (flags.url) {
    await cloneFromUrl(flags.url, ide);
  } else {
    await cloneFromExisting(ide);
  }
}

async function cloneFromUrl(url, ide) {
  // Derive the root repo directory name from the URL
  const repoName = basename(url, '.git');

  // Create a parent workspace directory named after the project
  // We'll rename it after reading project.yaml if the project name differs
  const parentDir = resolve(repoName + '-workspace');

  if (existsSync(parentDir)) {
    console.error(`Directory ${parentDir} already exists. Remove it or run "m clone" from inside the root repo.`);
    process.exit(1);
  }

  mkdirSync(parentDir, { recursive: true });

  // 1. Clone root repo
  console.log(`Cloning root repo: ${url}`);
  gitClone(url, join(parentDir, repoName));
  console.log(`  ✓ ${repoName}/`);

  // 2. Read topology
  const rootDir = join(parentDir, repoName);
  const topology = readTopology(rootDir);
  const repos = getReferencedRepos(topology);

  console.log(`  Project: ${topology.project} (${repos.length} managed repos)`);
  console.log('');

  // 3. Clone managed repos
  const clonedDirs = [repoName];

  for (const repo of repos) {
    const repoDir = join(parentDir, repo.repoName);
    if (existsSync(repoDir)) {
      console.log(`  · ${repo.repoName}/ already exists (skipped)`);
      clonedDirs.push(repo.repoName);
      continue;
    }

    // Derive clone URL from root URL pattern + component location
    const cloneUrl = deriveCloneUrl(url, repo.location);
    console.log(`  Cloning ${repo.repoName}...`);
    gitClone(cloneUrl, repoDir);
    console.log(`  ✓ ${repo.repoName}/`);
    clonedDirs.push(repo.repoName);
  }

  // 4. Generate workspace file
  console.log('');
  const wsPath = generateWorkspace(parentDir, topology.project, clonedDirs, { ide });
  console.log(`  ✓ ${basename(wsPath)} generated`);

  // 5. Summary
  printSummary(parentDir, topology.project, clonedDirs, wsPath, ide);
}

async function cloneFromExisting(ide) {
  // Assume we're inside the root repo — find project.yaml
  const cwd = process.cwd();
  let rootDir = cwd;

  if (!existsSync(join(rootDir, 'project.yaml'))) {
    console.error('No project.yaml found. Run this from inside the root repo, or provide a URL: m clone <url>');
    process.exit(1);
  }

  const parentDir = resolve(rootDir, '..');
  const repoName = basename(rootDir);

  const topology = readTopology(rootDir);
  const repos = getReferencedRepos(topology);

  console.log(`Project: ${topology.project} (${repos.length} managed repos)`);
  console.log('');

  const clonedDirs = [repoName];

  for (const repo of repos) {
    const repoDir = join(parentDir, repo.repoName);
    if (existsSync(repoDir)) {
      console.log(`  · ${repo.repoName}/ already exists (skipped)`);
      clonedDirs.push(repo.repoName);
      continue;
    }

    // Try to derive URL from root repo's remote
    const rootRemote = getGitRemote(rootDir);
    if (!rootRemote) {
      console.error(`  ✗ Cannot determine clone URL for ${repo.repoName} — root repo has no remote`);
      continue;
    }

    const cloneUrl = deriveCloneUrl(rootRemote, repo.location);
    console.log(`  Cloning ${repo.repoName}...`);
    gitClone(cloneUrl, repoDir);
    console.log(`  ✓ ${repo.repoName}/`);
    clonedDirs.push(repo.repoName);
  }

  // Generate workspace file
  console.log('');
  const wsPath = generateWorkspace(parentDir, topology.project, clonedDirs, { ide });
  console.log(`  ✓ ${basename(wsPath)} generated`);

  printSummary(parentDir, topology.project, clonedDirs, wsPath, ide);
}

function gitClone(url, dest) {
  execSync(`git clone "${url}" "${dest}"`, { stdio: 'pipe' });
}

function getGitRemote(repoDir) {
  try {
    return execSync('git remote get-url origin', { cwd: repoDir, stdio: 'pipe' })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

/**
 * Derive a clone URL for a managed repo from the root repo URL and the
 * component location in project.yaml.
 *
 * Root URL: git@gitlab.com:acme/todo-m-workshop/todo-m-root.git
 * Location: acme/todo-m-workshop/todo-m-api-read
 * Result:   git@gitlab.com:acme/todo-m-workshop/todo-m-api-read.git
 *
 * Supports both SSH (git@host:path) and HTTPS (https://host/path) formats.
 */
function deriveCloneUrl(rootUrl, location) {
  // SSH format: git@gitlab.com:group/subgroup/repo.git
  const sshMatch = rootUrl.match(/^(git@[^:]+:)/);
  if (sshMatch) {
    return `${sshMatch[1]}${location}.git`;
  }

  // HTTPS format: https://gitlab.com/group/subgroup/repo.git
  const httpsMatch = rootUrl.match(/^(https?:\/\/[^/]+)\//);
  if (httpsMatch) {
    return `${httpsMatch[1]}/${location}.git`;
  }

  // Fallback: just replace the last path segment
  throw new Error(
    `Cannot derive clone URL for "${location}" from root URL "${rootUrl}". ` +
    `Provide the full URL manually.`
  );
}

function parseFlags(args) {
  const flags = { url: null, ide: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--ide' && args[i + 1]) {
      flags.ide = args[++i];
    } else if (!args[i].startsWith('-')) {
      flags.url = args[i];
    }
  }

  return flags;
}

function printSummary(parentDir, projectName, dirs, wsPath, ide) {
  console.log('');
  console.log(`Workspace ready at ${parentDir}/`);
  console.log('');
  for (const d of dirs) console.log(`  ${d}/`);
  console.log(`  ${basename(wsPath)}`);
  console.log('');

  if (ide === 'vscode') {
    console.log(`Open in VS Code:`);
    console.log(`  code ${wsPath}`);
  }
}
