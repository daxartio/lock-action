import * as core from '@actions/core'
import * as github from '@actions/github'
import { GitHub } from '@actions/github/lib/utils'
import * as lib from './lib'
import * as wait from './wait'

enum State {
  Locked,
  AlreadyLocked
}

type LockResult = {
  state: State
  metadata?: lib.Metadata
}

export const lock = async (input: lib.Input): Promise<void> => {
  const startTime = Date.now()

  for (;;) {
    const result = await tryLock(input)
    switch (result.state) {
      case State.Locked:
        core.info(`The key ${input.key} has been locked`)
        return
      case State.AlreadyLocked:
        core.setOutput('already_locked', true)

        if (result.metadata) {
          core.info(`Metadata ${JSON.stringify(result.metadata)}`)
        }

        if (input.unlockWaitEnabled) {
          const elapsedTime = (Date.now() - startTime) / 1000 // in seconds
          if (elapsedTime >= input.unlockWaitTimeout) {
            core.setFailed(
              `Failed to acquire lock after waiting for ${input.unlockWaitTimeout} seconds`
            )
            return
          }

          core.info(
            `Failed to acquire lock. The key ${input.key} is already locked. Retrying in ${input.unlockWaitInterval} seconds...`
          )
          await wait.wait(input.unlockWaitInterval * 1000)
          continue
        }

        if (input.ignoreAlreadyLockedError) {
          core.info(
            `Failed to acquire lock. The key ${input.key} is already locked. Ignoring error.`
          )
          return
        }

        core.setFailed(
          `Failed to acquire lock. The key ${input.key} is already locked`
        )
        return
    }
  }
}

const tryLock = async (input: lib.Input): Promise<LockResult> => {
  const octokit = github.getOctokit(input.githubToken)
  const branch = `${input.keyPrefix}${input.key}`
  const ref = `heads/${branch}`

  const result = await getBranch(octokit, branch, input)
  core.debug(`result: ${JSON.stringify(result)}`)

  if (!result.repository.ref) {
    // If the key doesn't exist, create the key
    const commit = await octokit.rest.git.createCommit({
      owner: input.owner,
      repo: input.repo,
      message: lib.getMsg(input),
      tree: lib.rootTree
    })

    try {
      await octokit.rest.git.createRef({
        owner: input.owner,
        repo: input.repo,
        ref: `refs/${ref}`,
        sha: commit.data.sha
      })
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (!error.message.includes('Reference already exists')) {
          throw error
        }
      }

      return { state: State.AlreadyLocked }
    }

    return { state: State.Locked }
  }

  const metadata = lib.extractMetadata(
    result.repository.ref.target.message,
    input.key
  )

  switch (metadata.state) {
    case 'lock':
      // The key has already been locked
      return { metadata, state: State.AlreadyLocked }

    case 'unlock': {
      const commit = await octokit.rest.git.createCommit({
        owner: input.owner,
        repo: input.repo,
        message: lib.getMsg(input),
        tree: result.repository.ref.target.tree.oid,
        parents: [result.repository.ref.target.oid]
      })

      try {
        await octokit.rest.git.updateRef({
          owner: input.owner,
          repo: input.repo,
          ref: ref,
          sha: commit.data.sha
        })
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (!error.message.includes('Update is not a fast forward')) {
            throw error
          }
        }

        return { metadata, state: State.AlreadyLocked }
      }

      return { state: State.Locked }
    }
    default:
      throw new Error(
        `The state of key ${input.key} is invalid ${metadata.state}`
      )
  }
}

interface BranchData {
  repository: {
    ref: {
      prefix: string
      name: string
      target: {
        oid: string
        message: string
        committedDate: string
        tree: {
          oid: string
        }
      }
    } | null
  }
}

async function getBranch(
  octokit: InstanceType<typeof GitHub>,
  branch: string,
  input: lib.Input
): Promise<BranchData> {
  try {
    return await octokit.graphql<BranchData>(
      `query($owner: String!, $repo: String!, $ref: String!) {
repository(owner: $owner, name: $repo) {
  ref(qualifiedName: $ref) {
    prefix
    name
    target {
      ... on Commit {
        oid
        message
        committedDate
        tree {
          oid
        }
      }
    }
  }
}
}`,
      {
        owner: input.owner,
        repo: input.repo,
        ref: branch
      }
    )
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.error(`failed to get a key ${input.key}: ${error.message}`)
    }

    throw error
  }
}
