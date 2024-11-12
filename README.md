# Lock Action

**Lock Action** is a GitHub Action that enables branch-based lock management
within a repository, allowing workflows to coordinate or control concurrent
operations by locking keys.

## Usage

To use this action, configure it in your GitHub workflow as follows:

```yaml
- name: Lock Action
  uses: daxartio/lock-action@vX.X.X
  with:
    mode: <lock|unlock|check> # Required. Set the mode to "lock", "unlock", or "check".
    key: <unique-key> # Required. Unique key to manage locks per service or environment.
```

### Example

```yaml
jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - name: Lock Resource
        uses: daxartio/lock-action@vX.X.X
        with:
          mode: lock
          key: service-prod

      - name: Perform Critical Operation
        run: echo "Critical operation running..."

      - name: Unlock Resource
        uses: daxartio/lock-action@vX.X.X
        with:
          mode: unlock
          key: service-prod
```

## Inputs

| Name                          | Description                                                                                              | Required | Default               |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- | -------- | --------------------- |
| `mode`                        | Operation mode: `lock`, `unlock`, or `check`.                                                            | Yes      | -                     |
| `key`                         | Lock key, used to manage locks by service or environment.                                                | Yes      | -                     |
| `key_prefix`                  | Prefix for the lock key. Creates and updates branch `${keyPrefix}${key}` for each key.                   | No       | `lock-`               |
| `github_token`                | GitHub Access Token with `contents:write` permission to create branches and commits.                     | No       | `${{ github.token }}` |
| `repo_owner`                  | Repository owner for creating branches. Defaults to `$GITHUB_REPOSITORY_OWNER`.                          | No       | -                     |
| `repo_name`                   | Repository name for creating branches. Defaults to the repository name of `$GITHUB_REPOSITORY`.          | No       | -                     |
| `message`                     | Reason and context message for lock/unlock operations.                                                   | No       | -                     |
| `ignore_already_locked_error` | If `true`, the action does not fail if the lock is already acquired.                                     | No       | `false`               |
| `unlock_wait_enabled`         | If `true`, the action waits for lock release if it's already held.                                       | No       | `true`                |
| `unlock_wait_timeout`         | Max time (in seconds) to wait for the lock release. Only used if `unlock_wait_enabled` is `true`.        | No       | `10`                  |
| `unlock_wait_interval`        | Interval (in seconds) between checks for lock release. Only relevant if `unlock_wait_enabled` is `true`. | No       | `1`                   |

## Outputs

| Name             | Description                             |
| ---------------- | --------------------------------------- |
| `already_locked` | Indicates if the key is already locked. |
| `result`         | Result of the lock operation.           |

## Example Scenarios

### Lock and Unlock a Resource

```yaml
jobs:
  lock-and-unlock:
    runs-on: ubuntu-latest
    steps:
      - name: Lock Resource
        uses: daxartio/lock-action@vX.X.X
        with:
          mode: lock
          key: example-key

      - name: Perform Critical Task
        run: echo "Running a critical task..."

      - name: Unlock Resource
        uses: daxartio/lock-action@vX.X.X
        with:
          mode: unlock
          key: example-key
```

### Wait for Lock Release

```yaml
jobs:
  wait-for-lock:
    runs-on: ubuntu-latest
    steps:
      - name: Wait and Acquire Lock
        uses: daxartio/lock-action@vX.X.X
        with:
          mode: lock
          key: example-key
          unlock_wait_enabled: true
          unlock_wait_timeout: 20
```

## Notes

- Ensure the GitHub token used has `contents:write` permissions to create
  branches and commits.
- Use the `unlock_wait_enabled`, `unlock_wait_timeout`, and
  `unlock_wait_interval` inputs to control lock acquisition behavior when the
  lock is already held.
