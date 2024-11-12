import * as core from '@actions/core'
import * as check from './check'
import * as lib from './lib'
import * as lock from './lock'
import * as post from './post'
import * as unlock from './unlock'

export const run = async (): Promise<void> => {
  await run_with_input({
    post: core.getState('post'),
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
    )
  })
}

const run_with_input = async (input: lib.Input): Promise<void> => {
  if (input.post) {
    post.post(input)
    return
  }
  core.saveState('post', 'true')
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
      throw new Error(`Invalid mode: ${input.mode}`)
  }
}
