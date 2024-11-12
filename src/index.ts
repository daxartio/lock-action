import * as core from '@actions/core'
import { run } from './main'

try {
  void run()
} catch (error) {
  core.setFailed(error instanceof Error ? error.message : JSON.stringify(error))
}
