/** Public terminal launcher basename shipped with the VecLeap desktop app. */

export const DESKTOP_CLI_LAUNCHER_BASENAME = 'vecleap' as const

export const DESKTOP_CLI_SYMLINK_DARWIN = '/usr/local/bin/vecleap' as const

/** Filename of the bundled launcher for one packaging target. */
export function desktopCliLauncherFilename(platform: 'darwin' | 'win32'): string {
  return platform === 'win32' ? `${DESKTOP_CLI_LAUNCHER_BASENAME}.cmd` : DESKTOP_CLI_LAUNCHER_BASENAME
}
