import {resolve} from 'path'
import {readFile as _readFile, writeFile as _writeFile} from 'fs'
import {promisify} from 'util'
import debug from './debug'
import run, {Command, CommandOptions} from './run'
import assert from './assert'

const readFile = promisify(_readFile)
const writeFile = promisify(_writeFile)

export class Repository {
  static async isRoot(dir = process.cwd()): Promise<boolean> {
    debug(`checking if ${dir} is a git root`)

    try {
      const repo = new Repository(dir)
      const root = await repo.revParse('--show-toplevel')
      return root === resolve(dir)
    } catch {
      return false
    }
  }

  static async init(root = process.cwd()): Promise<Repository> {
    debug(`initializing ${root} as a git root`)
    const repo = new Repository(root)
    await repo.git('init').success()
    return repo
  }

  static async import(root = process.cwd()): Promise<Repository> {
    debug(`importing repository from ${root}`)

    assert(
      await this.isRoot(root),
      `${root} is not the root of a Git repository`
    )

    return new Repository(root)
  }

  static async clone(
    origin: Repository | string,
    root = process.cwd()
  ): Promise<Repository> {
    debug(`cloning ${origin} into ${root}`)

    const repo = new Repository(root)

    if (typeof origin === 'string') {
      await repo.git('clone', origin, '.').success()
    } else {
      await repo.git('clone', origin.root, '.').success()
    }

    return repo
  }

  protected root: string

  protected constructor(root: string) {
    this.root = resolve(root)
  }

  protected git(...args: string[]): Command {
    const options: Partial<CommandOptions> = {cwd: this.root}
    return run('git', ...args, options as string /* hack */)
  }

  async addRemote(name: string, remote: string): Promise<void> {
    await this.git('remote', 'add', name, remote).success()
  }

  async removeRemote(name: string): Promise<void> {
    await this.git('remote', 'rm', name).success()
  }

  async hasRemote(remote: string): Promise<boolean> {
    debug(`checking if ${remote} is a valid git remote`)
    const result = await this.git('remote', 'show', remote).result()
    return result.isSuccess()
  }

  async hasBranch(name: string, remote?: string): Promise<boolean> {
    try {
      if (remote) {
        debug(`checking if remote branch ${name} exists`)
        await this.revParse(`refs/remotes/${remote}/${name}`, '--verify')
      } else {
        debug(`checking if local branch ${name} exists`)
        await this.revParse(`refs/heads/${name}`, '--verify')
      }

      return true
    } catch {
      return false
    }
  }

  async getBranches(
    pattern?: string | null,
    remote?: string
  ): Promise<string[]> {
    const args = ['--list']

    if (remote) {
      args.push('--all')
    }

    if (pattern && remote) {
      debug(`getting remote branches from ${remote} matching ${pattern}`)
      args.push(`${remote}/${pattern}`)
    } else if (remote) {
      debug(`getting remote branches from ${remote}`)
      args.push(`${remote}/*`)
    } else if (pattern) {
      debug(`getting local branches matching ${pattern}`)
      args.push(pattern)
    } else {
      debug('getting local branches')
    }

    const result = await this.git('branch', ...args).success()
    const prefix = remote ? `  remotes/${remote}/` : `  `

    return result.stdout
      .split('\n')
      .filter(b => b.trim() !== '')
      .map(b => b.slice(prefix.length))
  }

  async getCurrentBranch(): Promise<string> {
    debug('getting current branch name')
    const result = await this.git('symbolic-ref', '--short', 'HEAD').success()
    return result.stdout.trim()
  }

  async createBranch(
    name: string,
    ref?: string | null,
    ...options: string[]
  ): Promise<void> {
    if (ref) {
      debug(`creating branch ${name} from ${ref}`)
      await this.git('branch', ...options, name, ref).success()
    } else {
      debug(`creating branch ${name}`)
      await this.git('branch', ...options, name).success()
    }
  }

  async checkout(name: string, ...options: string[]): Promise<void> {
    debug(`checking out branch ${name}`)
    await this.git('checkout', ...options, name).success()
  }

  async fetch(
    remote: string,
    ref?: string | null,
    ...options: string[]
  ): Promise<void> {
    if (ref) {
      debug(`fetching remote ${remote} ${ref}`)
      await this.git('fetch', ...options, remote, ref).success()
    } else {
      debug(`fetching remote ${remote}`)
      await this.git('fetch', ...options, remote).success()
    }
  }

  async revParse(rev: string, ...options: string[]): Promise<string> {
    debug(`rev-parse ${rev}`)
    const parsed = await this.git('rev-parse', ...options, rev).success()
    return parsed.stdout.trim()
  }

  async getCommit(sha: string): Promise<Commit> {
    debug(`getting single commit ${sha}`)

    sha = await this.revParse(sha)

    const {stdout} = await this.git(
      'log',
      sha,
      '--format=%B',
      '--max-count=1'
    ).success()

    return new Commit(this, sha, stdout.trim())
  }

  async getCommitsInRange(before: string, after: string): Promise<Commit[]> {
    debug(`getting commits in range ${before}..${after}`)

    const {stdout} = await this.git(
      'log',
      '--format=%H',
      `${before}..${after}`
    ).success()

    const shas = stdout.trim().split('\n')

    debug(`found shas ${shas.join(', ')}`)

    const commits = await Promise.all(
      shas.map(async sha => this.getCommit(sha))
    )

    return commits.reverse()
  }

  async readFile(path: string, ref?: string): Promise<string> {
    if (ref) {
      debug(`reading ${path} from ${ref}`)
      const result = await this.git('show', `${ref}:${path}`).success()
      return result.stdout
    } else {
      debug(`reading ${path} from work tree`)
      return readFile(resolve(this.root, path), {encoding: 'utf8'})
    }
  }

  async writeFile(path: string, content: string, add = false): Promise<void> {
    debug(`writing ${path} to work tree`)
    await writeFile(resolve(this.root, path), content)

    if (add) {
      await this.add(path)
    }
  }

  async add(path: string): Promise<void> {
    debug(`adding ${path}`)
    await this.git('add', path).success()
  }

  async commit(message?: string | null, ...options: string[]): Promise<Commit> {
    debug('commiting')

    if (message) {
      await this.git('commit', ...options, '-m', message).success()
    } else {
      await this.git('commit', ...options).success()
    }

    return this.getCommit('HEAD')
  }

  async cherryPick(commit: string): Promise<'clean'>
  async cherryPick(
    commit: string,
    conflict: 'throw',
    empty: 'throw'
  ): Promise<'clean'>
  async cherryPick(
    commit: string,
    conflict: 'commit' | 'skip'
  ): Promise<'clean' | 'conflict'>
  async cherryPick(
    commit: string,
    conflict: 'throw',
    empty: 'commit' | 'skip'
  ): Promise<'clean' | 'empty'>
  async cherryPick(
    commit: string,
    conflict: 'commit' | 'skip',
    empty: 'commit' | 'skip'
  ): Promise<'clean' | 'conflict' | 'empty'>
  async cherryPick(
    commit: string,
    conflict: 'commit' | 'skip' | 'throw' = 'throw',
    empty: 'commit' | 'skip' | 'throw' = 'throw'
  ): Promise<'clean' | 'conflict' | 'empty'> {
    debug(`cherry-pick ${commit} on to ${await this.getCurrentBranch()}`)

    try {
      const result = await this.git('cherry-pick', '-x', commit).result()

      if (result.isSuccess()) {
        return 'clean'
      } else if (result.stderr.includes('error: could not apply')) {
        debug(`conflicts\n${(await this.git('diff').result()).stdout}`)

        if (conflict === 'commit') {
          await this.commit(null, '--all', '--no-edit')
        } else if (conflict === 'throw') {
          throw result.error
        }

        return 'conflict'
      } else if (result.stderr.includes('cherry-pick is now empty')) {
        if (empty === 'commit') {
          await this.commit(null, '--allow-empty', '--no-edit')
        } else if (empty === 'throw') {
          throw result.error
        }

        return 'empty'
      } else {
        throw result.error
      }
    } finally {
      await this.git('cherry-pick', '--abort').result()
    }
  }

  async push(
    remote: string,
    branch?: string | null,
    ...options: string[]
  ): Promise<void> {
    if (branch) {
      debug(`pushing ${await this.getCurrentBranch()} to ${remote} ${branch}`)
      await this.git('push', ...options, remote, branch).success()
    } else {
      debug(`pushing ${await this.getCurrentBranch()} to ${remote}`)
      await this.git('push', ...options, remote).success()
    }
  }
}

export class Commit {
  constructor(
    readonly repo: Repository,
    readonly sha: string,
    readonly message: string
  ) {}

  get shortSha(): string {
    return this.sha.slice(0, 7)
  }

  get title(): string {
    const lines = this.message.split('\n')
    return lines[0] || ''
  }

  get oneline(): string {
    return `${this.shortSha} ${this.title}`
  }

  toJSON(): string {
    return this.sha
  }
}
