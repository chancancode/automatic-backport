import * as core from '@actions/core'
import assert from './assert'
import debug from './debug'
import Mapping from './mapping'
import {Repository} from './git'

function required(key: string): string {
  return core.getInput(key, {required: true})
}

function optional(key: string, fallback = ''): string {
  return core.getInput(key) || fallback
}

async function main(): Promise<void> {
  try {
    const before = required('before')
    debug(`before: ${before}`)
    core.setOutput('before', before)

    const after = required('after')
    debug(`after: ${after}`)
    core.setOutput('after', after)

    const tags = Mapping.fromYAML(optional('tags', '{}'))
    debug(`tags: ${JSON.stringify(tags, null, 2)}`)
    core.setOutput('tags', tags)

    assert(
      await Repository.isRoot(),
      'Not running inside the root of a Git repository. ' +
        'Did you forget to run actions/checkout first?'
    )

    const repo = await Repository.import()

    assert(
      await repo.hasRemote('origin'),
      'This Git repository does not have a remote `origin`. ' +
        'Did you forget to run actions/checkout first?'
    )

    await repo.fetch('origin')

    for (const [tag, branches] of tags) {
      for (const branch of branches) {
        if (!repo.hasBranch(branch)) {
          assert(
            await repo.hasBranch(branch, 'origin'),
            `This Git repository does not have a branch \`${branch}\`, ` +
              `which is the backport target for the ${JSON.stringify(tag)}.`
          )

          repo.createBranch(branch, `remotes/origin/${branch}`)
        }
      }
    }

    const commits = await repo.getCommitsInRange(before, after)
    debug(`commits:\n${commits.map(c => c.oneline).join('\n')}`)
    core.setOutput('commits', commits)
  } catch (error) {
    core.setFailed(error.message)
  }
}

main()
