import * as core from '@actions/core'
import * as github from '@actions/github'
import * as lib from './lib'

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

export const check = async (input: lib.Input): Promise<void> => {
  const octokit = github.getOctokit(input.githubToken)

  const branch = `${input.keyPrefix}${input.key}`
  try {
    // Get the branch
    const result = await octokit.graphql<BranchData>(
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
    core.debug(`result: ${JSON.stringify(result)}`)
    if (!result.repository.ref) {
      core.setOutput('result', {})
      core.setOutput('already_locked', false)
      return
    }

    const metadata = lib.extractMetadata(
      result.repository.ref.target.message,
      input.key
    )

    metadata.datetime = result.repository.ref.target.committedDate
    core.setOutput('result', JSON.stringify(metadata))
    core.setOutput('already_locked', metadata.state === 'lock')
  } catch (error: unknown) {
    // https://github.com/octokit/rest.js/issues/266
    if (error instanceof Error) {
      core.error(`failed to get a key ${input.key}: ${error.message}`)
    }
    throw error
  }
}
