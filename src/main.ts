import * as core from '@actions/core'
import * as check from './check'
import * as lib from './lib'
import * as lock from './lock'
import * as unlock from './unlock'

export const run = async (): Promise<void> => {
  await runWithInput({
    mode: core.getInput('mode'),
    key: core.getInput('key'),
    keyPrefix: core.getInput('key_prefix'),
    githubToken: core.getInput('github_token'),
    owner:
      core.getInput('repo_owner') || process.env.GITHUB_REPOSITORY_OWNER || '',
    repo:
      core.getInput('repo_name') ||
      (process.env.GITHUB_REPOSITORY || '').split('/')[1],
    message: core.getInput('message'),
    ignoreAlreadyLockedError: core.getBooleanInput(
      'ignore_already_locked_error'
    ),
    unlockWaitEnabled: core.getBooleanInput('unlock_wait_enabled'),
    unlockWaitTimeout: Number(core.getInput('unlock_wait_timeout')) || 0,
    unlockWaitInterval: Number(core.getInput('unlock_wait_interval')) || 0
  })
}

const runWithInput = async (input: lib.Input): Promise<void> => {
  switch (input.mode) {
    case 'lock':
      await lock.lock(input)
      break
    case 'unlock':
      await unlock.unlock(input)
      break
    case 'check':
      await check.check(input)
      break
    default:
      core.setFailed(`Invalid mode: ${input.mode}`)
  }
}
