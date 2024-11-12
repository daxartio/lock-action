import * as core from '@actions/core'
import * as lib from './lib'
import { unlock } from './unlock'

export const post = async (input: lib.Input): Promise<void> => {
  const gotLock = core.getState('got_lock')
  core.debug(`got_lock: ${gotLock}`)
  if (!core.getBooleanInput('post_unlock')) {
    core.info('post_unlock is disabled.')
  } else if (gotLock !== 'true') {
    core.info('skip unlocking as it failed to get a lock.')
  } else {
    core.info('unlocking...')
    input.mode = 'unlock'
    await unlock(input)
  }
}
