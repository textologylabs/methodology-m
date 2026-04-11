import { writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

/**
 * Generate an IDE workspace file for the project.
 *
 * @param {string} parentDir  — directory containing all cloned repos
 * @param {string} projectName — project name (used for the file name)
 * @param {string[]} repoDirs — directory names of all repos (root + managed)
 * @param {object} options
 * @param {string} options.ide — IDE to generate for (default: 'vscode')
 * @returns {string} path to the generated workspace file
 */
export function generateWorkspace(parentDir, projectName, repoDirs, options = {}) {
  const ide = options.ide || 'vscode';

  switch (ide) {
    case 'vscode':
      return generateVSCodeWorkspace(parentDir, projectName, repoDirs);
    default:
      throw new Error(
        `Unsupported IDE: "${ide}". Supported: vscode. ` +
        `(More IDEs can be added — PRs welcome.)`
      );
  }
}

function generateVSCodeWorkspace(parentDir, projectName, repoDirs) {
  const workspace = {
    folders: repoDirs.map((dir) => ({
      name: dir,
      path: dir,
    })),
    settings: {},
  };

  const filePath = join(parentDir, `${projectName}.code-workspace`);
  writeFileSync(filePath, JSON.stringify(workspace, null, 2) + '\n', 'utf8');
  return filePath;
}
