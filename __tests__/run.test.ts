import {dir, DirectoryResult} from 'tmp-promise'
import {writeFile as fsWriteFile} from 'fs'
import {promisify} from 'util'
import run from '../src/run'

const writeFile = promisify(fsWriteFile)

let tmpdir: DirectoryResult
let cwd: string

beforeEach(async () => {
  tmpdir = await dir({unsafeCleanup: true})
  cwd = process.cwd()
  process.chdir(tmpdir.path)
})

afterEach(async () => {
  process.chdir(cwd)
  await tmpdir.cleanup()
})

test('result()', async () => {
  await writeFile('hello.txt', 'hello world')

  const command = run('cat', 'hello.txt')

  expect(typeof command.pid).toBe('number')

  let result = await command.result()

  expect(result.command).toBe('cat')
  expect(result.args).toEqual(['hello.txt'])
  expect(result.options).toEqual({cwd: process.cwd()})
  expect(result.error).toBeNull()
  expect(result.stdout).toBe('hello world')
  expect(result.stderr).toBe('')

  expect(result.exitCode).toBe(0)
  expect(result.isSuccess()).toBe(true)
  expect(result.isError()).toBe(false)

  await writeFile('hello.txt', 'goodbye world')

  result = await result.retry().result()

  expect(result.command).toBe('cat')
  expect(result.args).toEqual(['hello.txt'])
  expect(result.options).toEqual({cwd: process.cwd()})
  expect(result.error).toBeNull()
  expect(result.stdout).toBe('goodbye world')
  expect(result.stderr).toBe('')

  expect(result.exitCode).toBe(0)
  expect(result.isSuccess()).toBe(true)
  expect(result.isError()).toBe(false)
})

test('result() does not throw on error', async () => {
  const command = run('cat', 'hello.txt')

  expect(typeof command.pid).toBe('number')

  let result = await command.result()

  expect(result.command).toBe('cat')
  expect(result.args).toEqual(['hello.txt'])
  expect(result.options).toEqual({cwd: process.cwd()})
  expect(result.error).not.toBeNull()
  expect(result.error?.message).toMatch(/Command failed: cat hello\.txt/)
  expect(result.stdout).toBe('')
  expect(result.stderr.trim()).toBe('cat: hello.txt: No such file or directory')

  expect(result.exitCode).toBe(1)
  expect(result.isSuccess()).toBe(false)
  expect(result.isError()).toBe(true)

  await writeFile('hello.txt', 'hello world')

  result = await result.retry().result()

  expect(result.command).toBe('cat')
  expect(result.args).toEqual(['hello.txt'])
  expect(result.options).toEqual({cwd: process.cwd()})
  expect(result.error).toBeNull()
  expect(result.stdout).toBe('hello world')
  expect(result.stderr).toBe('')

  expect(result.exitCode).toBe(0)
  expect(result.isSuccess()).toBe(true)
  expect(result.isError()).toBe(false)
})

test('success() throws on error or resolves with result', async () => {
  await expect(run('cat', 'hello.txt').success()).rejects.toThrow(
    /Command failed: cat hello\.txt/
  )

  await writeFile('hello.txt', 'hello world')

  const result = await run('cat', 'hello.txt').success()

  expect(result.command).toBe('cat')
  expect(result.args).toEqual(['hello.txt'])
  expect(result.options).toEqual({cwd: process.cwd()})
  expect(result.error).toBeNull()
  expect(result.stdout).toBe('hello world')
  expect(result.stderr).toBe('')

  expect(result.exitCode).toBe(0)
  expect(result.isSuccess()).toBe(true)
  expect(result.isError()).toBe(false)
})
