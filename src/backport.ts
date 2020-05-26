import {dir} from 'tmp-promise'
import {Repository, Commit} from './git'
import Mapping from './mapping'

export type CherryPickResult = 'clean' | 'conflict' | 'empty'
export type BackportPlan = ReadonlyMap<string, Commit[]>
export type BackportResult = ReadonlyMap<string, BranchBackportResult>

// TODO: duplicated from mapping.ts
export class JsonMap<T> extends Map<string, T> {
  toJSON(): object {
    const json = Object.create(null)

    for (const [key, value] of this) {
      json[key] = value
    }

    return json
  }
}

export default class Backport {
  constructor(
    readonly repo: Repository,
    readonly commits: Commit[],
    readonly mapping: Mapping
  ) {}

  get plan(): BackportPlan {
    const plan = new JsonMap<Commit[]>()

    for (const commit of this.commits) {
      for (const branch of this.branchesFor(commit)) {
        const list = plan.get(branch)

        if (list) {
          list.push(commit)
        } else {
          plan.set(branch, [commit])
        }
      }
    }

    return plan
  }

  async execute(): Promise<BackportResult> {
    const result = new JsonMap<BranchBackportResult>()

    for (const [branch, commits] of this.plan) {
      result.set(
        branch,
        await BranchBackportResult.execute(this.repo, branch, commits)
      )
    }

    return result
  }

  private branchesFor(commit: Commit): ReadonlySet<string> {
    const branches = new Set<string>()

    for (const [tag, targets] of this.mapping) {
      if (commit.message.includes(tag)) {
        for (const branch of targets) {
          branches.add(branch)
        }
      }
    }

    return branches
  }
}

export class BranchBackportResult {
  static async execute(
    repo: Repository,
    branch: string,
    commits: readonly Commit[]
  ): Promise<BranchBackportResult> {
    const tmpdir = await dir({unsafeCleanup: true})
    const map = new Map<Commit, CherryPickResult>()

    try {
      const fork = await Repository.clone(repo, tmpdir.path)

      await fork.checkout(branch)

      for (const commit of commits) {
        map.set(commit, await fork.cherryPick(commit.sha, 'commit', 'skip'))
      }

      const result = new BranchBackportResult(branch, commits, map)

      await fork.push('origin', `${branch}:${result.resultBranch}`)

      return result
    } finally {
      await tmpdir.cleanup()
    }
  }

  private constructor(
    readonly branch: string,
    readonly commits: readonly Commit[],
    readonly result: ReadonlyMap<Commit, CherryPickResult>
  ) {}

  get isSuccessful(): boolean {
    return this.conflict.length === 0
  }

  get clean(): Commit[] {
    return this.filterBy('clean')
  }

  get conflict(): Commit[] {
    return this.filterBy('conflict')
  }

  get empty(): Commit[] {
    return this.filterBy('empty')
  }

  get resultBranch(): string {
    if (this.isSuccessful) {
      return this.branch
    } else {
      return `backport-${this.label}-to-${this.branch}`
    }
  }

  private filterBy(result: CherryPickResult): Commit[] {
    return this.commits.filter(commit => this.result.get(commit) === result)
  }

  private get label(): string {
    const {commits} = this

    if (commits.length === 1) {
      return commits[0].shortSha
    } else {
      return `${commits[0].shortSha}-${commits[commits.length - 1].shortSha}`
    }
  }

  toJSON(): object {
    const {commits, isSuccessful, clean, conflict, empty, resultBranch} = this

    return Object.assign(Object.create(null), {
      commits,
      isSuccessful,
      clean,
      conflict,
      empty,
      resultBranch
    })
  }
}
