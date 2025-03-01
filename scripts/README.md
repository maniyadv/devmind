# DevMind Extension Scripts

This folder contains helper scripts for building, testing and publishing the DevMind extension.

## Scripts

- `build.sh`: Compiles TypeScript source code and packages extension into a VSIX file
- `install.sh`: Rebuilds the extension and installs it locally for testing
- `test-publish.sh`: Updates the extension version, builds and installs it locally
- `publish.sh`: Publishes a new version to the VS Code Marketplace

## Usage

### Local Installation for Testing

```bash
# Simple build and install
./scripts/install.sh

# Or specify a version number
./scripts/test-publish.sh 0.0.2
```

### Publishing a New Version

```bash
# This will update the version number, create a git commit,
# create a GitHub release, and publish to the VS Code Marketplace
./scripts/publish.sh 0.0.2
```

## Requirements

- Node.js and npm
- `vsce` package (`npm i -g vsce`)
- VS Code
- GitHub CLI (`gh`) - Only for `publish.sh`
