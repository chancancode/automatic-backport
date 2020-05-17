import {execFile, ChildProcess, ExecException} from 'child_process'
import debug from './debug'

export class CommandResult {
  constructor(
    readonly command: string,
    readonly args: readonly string[],
    readonly options: Readonly<CommandOptions>,
    readonly error: ExecException | null,
    readonly stdout: string,
    readonly stderr: string
  ) {
    debug(
      `Command \`${command} ${args.join(' ')}\` finished\n` +
        `exitCode: ${this.exitCode}\n` +
        `error: ${error?.message}\n` +
        `stdout: ${stdout}\n` +
        `stderr: ${stderr}`
    )
  }

  get exitCode(): number | null {
    if (this.error === null) {
      return 0
    } else {
      return this.error.code || null
    }
  }

  isSuccess(): this is SuccessResult {
    return this.error === null
  }

  isError(): this is ErrorResult {
    return !this.isSuccess()
  }

  retry(): Command {
    const {command, args, options} = this
    debug(`Retrying command \`${command} ${args.join(' ')}\` in ${options.cwd}`)
    return new Command(command, args, options)
  }
}

export type SuccessResult = CommandResult & {
  error: null
  exitCode: 0
  isSuccess(): true
  isError(): false
}

export type ErrorResult = CommandResult & {
  error: ExecException
  isSuccess(): false
  isError(): true
}

export interface CommandOptions {
  cwd: string
}

export class Command {
  readonly command: string
  readonly args: readonly string[]
  readonly options: Readonly<CommandOptions>
  private promise: Promise<CommandResult>
  private process!: ChildProcess

  constructor(
    command: string,
    args: readonly string[],
    options: Readonly<CommandOptions>
  ) {
    this.command = command
    this.args = args
    this.options = options
    this.promise = new Promise(resolve => {
      debug(
        `Running command \`${command} ${args.join(' ')}\` in ${options.cwd}`
      )
      this.process = execFile(command, args, options, (...result) => {
        resolve(new CommandResult(command, args, options, ...result))
      })
    })
  }

  get pid(): number {
    return this.process.pid
  }

  async result(): Promise<CommandResult> {
    return this.promise
  }

  async success(): Promise<SuccessResult> {
    const result = await this.promise

    if (result.isSuccess()) {
      return result
    } else {
      debug('Command failed while `success()` is used, throwing')
      throw result.error
    }
  }
}

function run(command: string, ...args: readonly string[]): Command
function run(
  command: string,
  options: Readonly<Partial<CommandOptions>>
): Command
function run(
  command: string,
  arg1: string,
  options: Readonly<Partial<CommandOptions>>
): Command
function run(
  command: string,
  arg1: string,
  arg2: string,
  options: Readonly<Partial<CommandOptions>>
): Command
function run(
  command: string,
  arg1: string,
  arg2: string,
  arg3: string,
  options: Readonly<Partial<CommandOptions>>
): Command
function run(
  command: string,
  arg1: string,
  arg2: string,
  arg3: string,
  arg4: string,
  options: Readonly<Partial<CommandOptions>>
): Command
function run(
  command: string,
  arg1: string,
  arg2: string,
  arg3: string,
  arg4: string,
  arg5: string,
  options: Readonly<Partial<CommandOptions>>
): Command
function run(
  command: string,
  arg1: string,
  arg2: string,
  arg3: string,
  arg4: string,
  arg5: string,
  arg6: string,
  options: Readonly<Partial<CommandOptions>>
): Command
function run(
  command: string,
  arg1: string,
  arg2: string,
  arg3: string,
  arg4: string,
  arg5: string,
  arg6: string,
  arg7: string,
  options: Readonly<Partial<CommandOptions>>
): Command
function run(
  command: string,
  arg1: string,
  arg2: string,
  arg3: string,
  arg4: string,
  arg5: string,
  arg6: string,
  arg7: string,
  arg8: string,
  options: Readonly<Partial<CommandOptions>>
): Command
function run(
  command: string,
  arg1: string,
  arg2: string,
  arg3: string,
  arg4: string,
  arg5: string,
  arg6: string,
  arg7: string,
  arg8: string,
  arg9: string,
  options: Readonly<Partial<CommandOptions>>
): Command
function run(
  command: string,
  ...args: (string | Readonly<Partial<CommandOptions>>)[]
): Command {
  const options: CommandOptions = {
    cwd: process.cwd()
  }

  const last = args[args.length - 1]

  if (typeof last !== 'string') {
    args.pop()
    options.cwd = last.cwd || options.cwd
  }

  return new Command(command, args as string[], options)
}

export default run
