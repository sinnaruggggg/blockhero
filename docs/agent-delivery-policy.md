# Agent Delivery Policy

## Default Close-Out Order

For this repository, the default completion order is:

1. Build the app artifacts needed for the change.
2. If an Android device is connected over `adb`, attempt phone installation.
3. Push the completed code to GitHub even if the phone install fails.

## Notes

- Phone installation is attempted whenever a device is available.
- Git push is not blocked by phone install success or failure.
- Release tagging/version bumps are still separate decisions and are only done when explicitly requested.
