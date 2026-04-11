import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Read project.yaml and extract topology information.
 * Uses a simple line parser — no YAML library dependency.
 *
 * @param {string} rootRepoDir — path to the cloned root repo
 * @returns {{ project: string, group: string, components: Array<{name, type, location}> }}
 */
export function readTopology(rootRepoDir) {
  const filePath = join(rootRepoDir, 'project.yaml');
  const content = readFileSync(filePath, 'utf8');

  const result = { project: '', group: '', components: [] };
  let currentComponent = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Top-level scalars
    if (trimmed.startsWith('project:')) {
      result.project = extractValue(trimmed);
    } else if (trimmed.startsWith('group:')) {
      result.group = extractValue(trimmed);
    }

    // Component list entries
    if (trimmed.startsWith('- name:')) {
      if (currentComponent) result.components.push(currentComponent);
      currentComponent = { name: extractValue(trimmed.replace('- ', '')), type: '', location: '' };
    } else if (currentComponent && trimmed.startsWith('type:')) {
      currentComponent.type = extractValue(trimmed);
    } else if (currentComponent && trimmed.startsWith('location:')) {
      currentComponent.location = extractValue(trimmed);
    }
  }

  if (currentComponent) result.components.push(currentComponent);

  return result;
}

function extractValue(line) {
  const parts = line.split(':');
  parts.shift();
  return parts.join(':').trim().replace(/^["']|["']$/g, '');
}

/**
 * Get the list of referenced (external) repos from the topology.
 * Returns the repo name (last segment of location) and full location.
 */
export function getReferencedRepos(topology) {
  return topology.components
    .filter((c) => c.type === 'referenced')
    .map((c) => ({
      name: c.name,
      location: c.location,
      repoName: c.location.split('/').pop(),
    }));
}
