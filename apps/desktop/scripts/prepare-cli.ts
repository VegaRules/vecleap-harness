/** Package terminal launch scripts that reuse the installed Electron runtime. */

import { chmodSync, copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { desktopCliLauncherFilename } from '../src/cli-launcher.ts'

/**
 * Copy the platform launcher into the application's public command directory.
 * @param destination - Physical runtime/cli directory prepared for the application.
 * @param platform - Target Desktop operating system.
 */
export function prepareDesktopCli(destination: string, platform: 'darwin' | 'win32'): void {
  const name = desktopCliLauncherFilename(platform)
  const command = join(destination, 'bin', name)
  mkdirSync(join(destination, 'bin'), { recursive: true })
  copyFileSync(join(import.meta.dirname, '..', 'cli', name), command)
  if (platform === 'darwin') chmodSync(command, 0o755)
}
