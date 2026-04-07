# Agent Delivery Policy

## Default Close-Out Order

For this repository, the default completion order is:

1. Build the app artifacts needed for the change.
2. If an Android device is connected over `adb`, attempt phone installation.
3. Push the completed code to GitHub even if the phone install fails.
4. If the work is meant to be delivered to users, bump the app version and create a GitHub release tag in the same turn.

## Notes

- Phone installation is attempted whenever a device is available.
- Git push is not blocked by phone install success or failure.
- User-facing delivery should end with a version bump and GitHub release tag, not just a `main` push.
- A `main` push alone is not considered complete when the user asked for deployment or expects auto-update.
- Release completion is only valid after confirming that GitHub `releases/latest` points to the new tag.
