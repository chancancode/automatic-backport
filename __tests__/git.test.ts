import {dir, DirectoryResult} from 'tmp-promise'
import {mkdir as _mkdir, rmdir as _rmdir} from 'fs'
import {resolve} from 'path'
import {promisify} from 'util'
import {Repository} from '../src/git'

const mkdir = promisify(_mkdir)
const rmdir = promisify(_rmdir)

let tmpdir: DirectoryResult
let cwd: string
let repo: Repository

beforeEach(async () => {
  repo = await Repository.import(resolve(__dirname, '..'))

  for (const branch of await repo.getBranches('fixtures/*', 'origin')) {
    if (!(await repo.hasBranch(branch))) {
      await repo.createBranch(branch, `remotes/origin/${branch}`)
    }
  }

  tmpdir = await dir({unsafeCleanup: true})
  cwd = process.cwd()
  process.chdir(tmpdir.path)
  repo = await Repository.init()

  await repo.addRemote('origin', resolve(__dirname, '..'))
})

afterEach(async () => {
  process.chdir(cwd)
  await tmpdir.cleanup()
})

describe('isRoot()', () => {
  test('not git repo', async () => {
    await rmdir('.git', {recursive: true})

    expect(await Repository.isRoot()).toBe(false)
    expect(await Repository.isRoot('.')).toBe(false)
  })

  test('inside git root', async () => {
    expect(await Repository.isRoot()).toBe(true)
    expect(await Repository.isRoot('.')).toBe(true)
  })

  test('inside git repo, but not root', async () => {
    await mkdir('foo')

    expect(await Repository.isRoot('foo')).toBe(false)

    process.chdir('foo')

    expect(await Repository.isRoot()).toBe(false)
    expect(await Repository.isRoot('.')).toBe(false)
    expect(await Repository.isRoot('..')).toBe(true)
  })
})

describe('hasRemote', () => {
  test('it works', async () => {
    expect(await repo.hasRemote('origin')).toBe(true)
    await repo.removeRemote('origin')
    expect(await repo.hasRemote('origin')).toBe(false)
  })
})

describe('branches', () => {
  test('it works', async () => {
    expect(await repo.hasBranch('fixtures/emberjs/beta')).toBe(false)
    expect(await repo.hasBranch('fixtures/emberjs/beta', 'origin')).toBe(false)

    expect(await repo.getBranches()).toEqual([])
    expect(await repo.getBranches(null, 'origin')).toEqual([])

    await repo.fetch('origin', 'fixtures/emberjs/beta', '--depth=1')

    expect(await repo.hasBranch('fixtures/emberjs/beta')).toBe(false)
    expect(await repo.hasBranch('fixtures/emberjs/beta', 'origin')).toBe(true)

    expect(await repo.getBranches()).toEqual([])
    expect(await repo.getBranches(null, 'origin')).toEqual([
      'fixtures/emberjs/beta'
    ])
    await repo.checkout('fixtures/emberjs/beta')

    expect(await repo.getCurrentBranch()).toBe('fixtures/emberjs/beta')

    expect(await repo.hasBranch('fixtures/emberjs/beta')).toBe(true)
    expect(await repo.hasBranch('fixtures/emberjs/beta', 'origin')).toBe(true)

    expect(await repo.getBranches()).toEqual(['fixtures/emberjs/beta'])
    expect(await repo.getBranches(null, 'origin')).toEqual([
      'fixtures/emberjs/beta'
    ])

    expect(await repo.hasBranch('foo')).toBe(false)
    expect(await repo.hasBranch('foo', 'origin')).toBe(false)

    await repo.createBranch('foo')

    expect(await repo.getCurrentBranch()).toBe('fixtures/emberjs/beta')

    expect(await repo.hasBranch('foo')).toBe(true)
    expect(await repo.hasBranch('foo', 'origin')).toBe(false)

    expect(await repo.getBranches()).toEqual(['fixtures/emberjs/beta', 'foo'])
    expect(await repo.getBranches(null, 'origin')).toEqual([
      'fixtures/emberjs/beta'
    ])

    await repo.checkout('foo')

    expect(await repo.getCurrentBranch()).toBe('foo')

    await repo.checkout('bar', '-b')

    expect(await repo.getCurrentBranch()).toBe('bar')

    expect(await repo.hasBranch('bar')).toBe(true)
    expect(await repo.hasBranch('bar', 'origin')).toBe(false)

    expect(await repo.getBranches()).toEqual([
      'bar',
      'fixtures/emberjs/beta',
      'foo'
    ])

    expect(await repo.getBranches(null, 'origin')).toEqual([
      'fixtures/emberjs/beta'
    ])
  })
})

describe('fetch', () => {
  test('it works', async () => {
    await expect(repo.revParse('origin/master')).rejects.toThrow(
      /unknown revision/
    )

    await repo.fetch('origin', 'master', '--depth=1')

    await expect(repo.revParse('origin/master')).resolves.not.toThrow()
  })
})

describe('getCommit', () => {
  test('it works', async () => {
    await repo.fetch('origin', 'fixtures/emberjs/bugfix-lts', '--depth=1')

    /*
      commit 9ea43769bb5f7b8538471d6c0710a81322cd0bae
      Author: Godfrey Chan <godfreykfc@gmail.com>
      Date:   Fri May 8 17:16:45 2020 -0700

      [BUGFIX lts] More assertions for Application lifecycle methods

      While debugging an issue in the ember-inspector test harness, we
      eventually we were dealing with very subtle hanging and errors
      that were ultimately caused by trying to boot an already destroyed
      `Application`.

      The issue was very difficult to debug partly due to some states
      (like `_bootPromise`) was reset in `willDestroy`, which is not
      necessary, but was enough to cause other lifecycle methods (like
      `boot`) to happily restart the process, but just hangs forever
      later on.

      This removes the state reset form `willDestroy` and just adds a
      lot more assertions in general, hopefully making these kind of
      situations fail louder and earlier.
    */
    const commit = await repo.getCommit('9ea4376')

    expect(commit.shortSha).toBe('9ea4376')

    expect(commit.sha).toBe('9ea43769bb5f7b8538471d6c0710a81322cd0bae')

    expect(commit.title).toBe(
      '[BUGFIX lts] More assertions for Application lifecycle methods'
    )

    expect(commit.oneline).toBe(
      '9ea4376 [BUGFIX lts] More assertions for Application lifecycle methods'
    )

    expect(commit.message).toBe(
      `
[BUGFIX lts] More assertions for Application lifecycle methods

While debugging an issue in the ember-inspector test harness, we
eventually we were dealing with very subtle hanging and errors
that were ultimately caused by trying to boot an already destroyed
\`Application\`.

The issue was very difficult to debug partly due to some states
(like \`_bootPromise\`) was reset in \`willDestroy\`, which is not
necessary, but was enough to cause other lifecycle methods (like
\`boot\`) to happily restart the process, but just hangs forever
later on.

This removes the state reset form \`willDestroy\` and just adds a
lot more assertions in general, hopefully making these kind of
situations fail louder and earlier.
      `.trim()
    )
  })
})

describe('getCommitsInRange', () => {
  test('it works', async () => {
    await repo.fetch('origin', 'fixtures/emberjs/pr-18920', '--depth=10')

    const commits = await repo.getCommitsInRange('911f7cc', '884a326')

    expect(commits.map(c => c.oneline)).toEqual([
      '85ccf1c adddress no-prototype-builtins linting failures',
      '16e1c71 Enable no-prototype-builtins linting rule',
      '884a326 Merge pull request #18920 from emberjs/fix-no-protytype-builtins'
    ])
  })
})

describe('commit', () => {
  test('it works', async () => {
    let commit = await repo.commit('it works', '--allow-empty')
    expect(commit).toEqual(await repo.getCommit('HEAD'))

    await expect(repo.readFile('foo.txt')).rejects.toThrowError()
    await expect(repo.readFile('bar.txt')).rejects.toThrowError()

    await repo.writeFile('foo.txt', 'foo', true)
    await repo.writeFile('bar.txt', 'bar')

    await expect(repo.readFile('foo.txt')).resolves.toBe('foo')
    await expect(repo.readFile('bar.txt')).resolves.toBe('bar')

    await expect(repo.readFile('foo.txt', 'HEAD')).rejects.toThrowError()
    await expect(repo.readFile('bar.txt', 'HEAD')).rejects.toThrowError()

    commit = await repo.commit('add foo.txt')
    expect(commit).toEqual(await repo.getCommit('HEAD'))

    await expect(repo.readFile('foo.txt')).resolves.toBe('foo')
    await expect(repo.readFile('bar.txt')).resolves.toBe('bar')

    await expect(repo.readFile('foo.txt', 'HEAD')).resolves.toBe('foo')
    await expect(repo.readFile('bar.txt', 'HEAD')).rejects.toThrowError()

    await repo.writeFile('foo.txt', 'FOO')

    await expect(repo.readFile('foo.txt')).resolves.toBe('FOO')
    await expect(repo.readFile('bar.txt')).resolves.toBe('bar')

    await expect(repo.readFile('foo.txt', 'HEAD')).resolves.toBe('foo')
    await expect(repo.readFile('bar.txt', 'HEAD')).rejects.toThrowError()

    await repo.add('.')

    commit = await repo.commit('add bar.txt, updates foo.txt')

    await expect(repo.readFile('foo.txt')).resolves.toBe('FOO')
    await expect(repo.readFile('bar.txt')).resolves.toBe('bar')

    await expect(repo.readFile('foo.txt', 'HEAD')).resolves.toBe('FOO')
    await expect(repo.readFile('bar.txt', 'HEAD')).resolves.toBe('bar')
  })
})

describe('cherryPick', () => {
  test('clean', async () => {
    await repo.writeFile(
      'message.txt',
      `
        <h1>Hello World!</h1>

        <p>Thanks for visiting our site</p>
      `,
      true
    )
    await repo.commit('initial commit')

    await repo.checkout('goodbye', '-b')
    await repo.writeFile(
      'message.txt',
      `
        <h1>Goodbye World!</h1>

        <p>Thanks for visiting our site</p>
      `,
      true
    )
    const goodbye = await repo.commit('goodbye')

    await repo.checkout('master')
    await repo.writeFile(
      'message.txt',
      `
        <h1>Hello World!</h1>

        <p>Thanks for visiting our site</p>

        <footer>&copy; Copyright 2020</footer>
      `,
      true
    )
    const footer = await repo.commit('footer')

    await expect(repo.cherryPick(goodbye.sha)).resolves.toBe('clean')
    await expect(repo.getCommit('HEAD')).resolves.not.toEqual(footer)
    await expect(repo.readFile('message.txt')).resolves.toBe(
      `
        <h1>Goodbye World!</h1>

        <p>Thanks for visiting our site</p>

        <footer>&copy; Copyright 2020</footer>
      `
    )
  })

  test('conflict', async () => {
    await repo.writeFile(
      'message.txt',
      `
        <h1>Hello World!</h1>

        <p>Thanks for visiting our site</p>
      `,
      true
    )
    await repo.commit('initial commit')

    await repo.checkout('goodbye', '-b')
    await repo.writeFile(
      'message.txt',
      `
        <h1>Goodbye World!</h1>

        <p>Thanks for visiting our site</p>
      `,
      true
    )
    const goodbye = await repo.commit('goodbye')

    await repo.checkout('master')
    await repo.writeFile(
      'message.txt',
      `
        <h1>Hello Everyone!</h1>

        <p>Thanks for visiting our site</p>
      `,
      true
    )
    const everyone = await repo.commit('everyone')

    await expect(repo.cherryPick(goodbye.sha)).rejects.toThrowError(
      /could not apply/
    )
    await expect(repo.getCommit('HEAD')).resolves.toEqual(everyone)
    await expect(repo.readFile('message.txt')).resolves.toBe(
      `
        <h1>Hello Everyone!</h1>

        <p>Thanks for visiting our site</p>
      `
    )

    await expect(repo.cherryPick(goodbye.sha, 'skip')).resolves.toBe('conflict')
    await expect(repo.getCommit('HEAD')).resolves.toEqual(everyone)
    await expect(repo.readFile('message.txt')).resolves.toBe(
      `
        <h1>Hello Everyone!</h1>

        <p>Thanks for visiting our site</p>
      `
    )

    await expect(repo.cherryPick(goodbye.sha, 'commit')).resolves.toBe(
      'conflict'
    )
    await expect(repo.getCommit('HEAD')).resolves.not.toEqual(everyone)
    await expect(repo.readFile('message.txt')).resolves.toBe(
      `
<<<<<<< HEAD
        <h1>Hello Everyone!</h1>
=======
        <h1>Goodbye World!</h1>
>>>>>>> ${goodbye.shortSha}... goodbye

        <p>Thanks for visiting our site</p>
      `
    )
  })

  test('empty', async () => {
    await repo.writeFile(
      'message.txt',
      `
        <h1>Hello World!</h1>

        <p>Thanks for visiting our site</p>
      `,
      true
    )
    await repo.commit('initial commit')

    await repo.checkout('goodbye', '-b')
    await repo.writeFile(
      'message.txt',
      `
        <h1>Goodbye World!</h1>

        <p>Thanks for visiting our site</p>
      `,
      true
    )
    const goodbye = await repo.commit('goodbye')

    await repo.checkout('master')
    await repo.writeFile(
      'message.txt',
      `
        <h1>Goodbye World!</h1>

        <p>Thanks for visiting our site</p>

        <footer>&copy; Copyright 2020</footer>
      `,
      true
    )
    const goodbyeWithFooter = await repo.commit('everyone')

    await expect(repo.cherryPick(goodbye.sha)).rejects.toThrowError(
      /cherry-pick is now empty/
    )
    await expect(repo.getCommit('HEAD')).resolves.toEqual(goodbyeWithFooter)
    await expect(repo.readFile('message.txt')).resolves.toBe(
      `
        <h1>Goodbye World!</h1>

        <p>Thanks for visiting our site</p>

        <footer>&copy; Copyright 2020</footer>
      `
    )

    await expect(repo.cherryPick(goodbye.sha, 'throw', 'skip')).resolves.toBe(
      'empty'
    )
    await expect(repo.getCommit('HEAD')).resolves.toEqual(goodbyeWithFooter)
    await expect(repo.readFile('message.txt')).resolves.toBe(
      `
        <h1>Goodbye World!</h1>

        <p>Thanks for visiting our site</p>

        <footer>&copy; Copyright 2020</footer>
      `
    )

    await expect(repo.cherryPick(goodbye.sha, 'throw', 'commit')).resolves.toBe(
      'empty'
    )
    await expect(repo.getCommit('HEAD')).resolves.not.toEqual(goodbyeWithFooter)
    await expect(repo.readFile('message.txt')).resolves.toBe(
      `
        <h1>Goodbye World!</h1>

        <p>Thanks for visiting our site</p>

        <footer>&copy; Copyright 2020</footer>
      `
    )
  })
})

describe('push', () => {
  test('it works', async () => {
    await repo.writeFile('message.txt', 'hello world', true)
    await repo.commit('initial commit')

    // Git won't let us push later if the branch is currently checked out
    await repo.checkout('another', '-b')

    const clone = await dir({unsafeCleanup: true})

    try {
      const fork = await Repository.clone(repo, clone.path)

      await fork.checkout('master')
      await fork.writeFile('message.txt', 'goodbye world', true)
      await fork.commit('goodbye')

      await expect(repo.getCommit('master')).resolves.toHaveProperty(
        'message',
        'initial commit'
      )

      await expect(repo.readFile('message.txt', 'master')).resolves.toBe(
        'hello world'
      )

      await fork.push('origin')

      await expect(repo.getCommit('master')).resolves.toHaveProperty(
        'message',
        'goodbye'
      )

      await expect(repo.readFile('message.txt', 'master')).resolves.toBe(
        'goodbye world'
      )
    } finally {
      await clone.cleanup()
    }
  })
})
