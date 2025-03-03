#!/bin/bash

# Exit on error
set -e

echo "🧹 Cleaning output directory..."
rm -rf ./out

echo "🏗️ Building extension..."
npm run compile

echo "📦 Packaging VSIX..."
vsce package

echo "✅ Build complete!"
