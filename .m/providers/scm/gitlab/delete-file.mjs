#!/usr/bin/env node

// Copyright (C) 2026 Textology Labs Ltd. All rights reserved.

// scm.push_or_update_files delete-action fallback for the GitLab
// provider (see .m/providers/scm/gitlab.md). Calls the GitLab REST
// API directly because the MCP gitlab wrapper has no delete primitive
// at time of writing.
//
// Usage:
//   node delete-file.mjs <project> <branch> <path> <message> <token>
//
// <project> is the URL-encodable project path (e.g.
// "methodology-m/todo-m-workshop/todo-m-root") OR a numeric project
// id; both work against the GitLab API. <token> needs
// write_repository scope on the project.
//
// Exits 0 on success, 1 on failure (writing the GitLab response body
// to stderr for diagnostics).

const [, , project, branch, path, message, token] = process.argv;

if (!project || !branch || !path || !message || !token) {
  console.error(
    'usage: node delete-file.mjs <project> <branch> <path> <message> <token>',
  );
  process.exit(2);
}

const base = process.env.GITLAB_URL ?? 'https://gitlab.com';
const url = `${base}/api/v4/projects/${encodeURIComponent(project)}/repository/files/${encodeURIComponent(path)}?branch=${encodeURIComponent(branch)}&commit_message=${encodeURIComponent(message)}`;

const res = await fetch(url, {
  method: 'DELETE',
  headers: { 'PRIVATE-TOKEN': token },
});

if (!res.ok) {
  const body = await res.text();
  console.error(`DELETE ${path} failed: ${res.status} ${body}`);
  process.exit(1);
}
