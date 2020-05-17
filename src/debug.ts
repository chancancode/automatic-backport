import * as core from '@actions/core'

export default function debug(message: string): void {
  core.isDebug() && core.debug(message)
}
