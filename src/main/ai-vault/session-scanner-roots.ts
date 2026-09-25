import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { resolveOmpSessionsDir } from './omp-session-root'

// The default local roots for the two agents whose subagent transcripts are
// read back by renderer-supplied path (Claude and OMP). Discovery scans these;
// the IPC listers use the root enumerations below to reject arbitrary paths.
export const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects')
// ~/.claude-profile-work: HOME-isolated Claude profile used outside Orca.
const CLAUDE_WORK_PROJECTS_DIR = join(homedir(), '.claude-profile-work', '.claude', 'projects')

// The CLAUDE_CONFIG_DIR a projects root belongs to, or null for the default
// ~/.claude so its resume command stays prefix-free (pinning the CLI's own
// default would repoint its credential lookup — see claude-config-dir-pin).
export function claudeConfigDirForProjectsDir(
  projectsDir: string,
  defaultProjectsDir: string
): string | null {
  return projectsDir === defaultProjectsDir ? null : dirname(projectsDir)
}

// The local host and each WSL distro's `~/.claude/projects`. Callers reading
// Claude session files by path use these roots to reject arbitrary paths.
export function claudeProjectsRootDirs(args: {
  claudeProjectsDir?: string
  wslHomeDirs?: readonly string[]
}): string[] {
  return [
    // An explicit dir pins the scan (fixtures, per-account resolution); only the
    // default covers both recognised local homes.
    ...(args.claudeProjectsDir
      ? [args.claudeProjectsDir]
      : [CLAUDE_PROJECTS_DIR, CLAUDE_WORK_PROJECTS_DIR]),
    ...(args.wslHomeDirs ?? []).map((homeDir) => join(homeDir, '.claude', 'projects'))
  ]
}

// The local host and each WSL distro's OMP sessions root. Callers reading OMP
// session files by path use these roots to reject arbitrary paths.
export function ompSessionsRootDirs(args: {
  ompSessionsDir?: string
  wslHomeDirs?: readonly string[]
}): string[] {
  return (
    sessionRootDirs(
      resolveOmpSessionsDir({ sessionsDir: args.ompSessionsDir }),
      normalizedWslHomeDirs(args.wslHomeDirs),
      ['.omp', 'agent', 'sessions']
    )
      // Why: OMP_CODING_AGENT_DIR='/' normalizes to '', which resolve()s to the
      // process cwd — an empty root would silently allowlist it.
      .filter((rootDir) => rootDir.trim().length > 0)
  )
}

export function normalizedWslHomeDirs(homeDirs: readonly string[] | undefined): string[] {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const homeDir of homeDirs ?? []) {
    const trimmed = homeDir.trim()
    if (!trimmed || seen.has(trimmed)) {
      continue
    }
    seen.add(trimmed)
    unique.push(trimmed)
  }
  return unique
}

export function sessionRootDirs(
  hostRootDir: string,
  wslHomeDirs: readonly string[],
  segments: readonly string[]
): string[] {
  return [hostRootDir, ...wslHomeDirs.map((homeDir) => join(homeDir, ...segments))]
}
