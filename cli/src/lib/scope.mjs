import { homedir } from 'node:os';
import { resolve } from 'node:path';

/**
 * Parse scope-relevant flags from a command's argv.
 *
 * Project scope (default): target = positional path or cwd; mRoot = '.m'.
 *   Wrappers reference the canonical layer via the relative `.m/` path,
 *   which sits beside the agent runtime in the same project tree.
 *
 * User scope (--user): target = $HOME; mRoot = '~/.m'.
 *   Wrappers reference an absolute path so an agent invoked from any
 *   working directory still resolves the canonical layer at the user
 *   level. Positional path arg is rejected.
 *
 * Returns the resolved target dir, mRoot placeholder value, scope label,
 * the remaining flags (rest), and a `userScope` boolean.
 */
export function resolveScope(args) {
  const userScope = args.includes('--user');
  const rest = args.filter((a) => a !== '--user');
  const positional = rest.find((a) => !a.startsWith('--'));

  if (userScope && positional) {
    throw new Error('--user is incompatible with an explicit path argument.');
  }

  if (userScope) {
    return {
      target: homedir(),
      mRoot: '~/.m',
      scope: 'user',
      userScope: true,
      rest,
    };
  }

  return {
    target: resolve(positional || '.'),
    mRoot: '.m',
    scope: 'project',
    userScope: false,
    rest,
  };
}
