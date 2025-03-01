#!/bin/bash

# Exit on error
set -e

# Clean any existing extensions
echo "🧹 Uninstalling previous version..."
code --uninstall-extension maniyadv.devmind || true

echo "🏗️ Building extension..."
npm run compile

echo "📦 Packaging VSIX..."
vsce package

echo "📥 Installing extension..."
code --install-extension *.vsix

echo "✅ Installation complete!"
