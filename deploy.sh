#!/bin/bash
# Kaptrix Tax Tool — one-shot deploy to GitHub Pages
# Usage: PAT=your_token bash deploy.sh

set -e

if [ -z "$PAT" ]; then
  echo "❌  Set your GitHub PAT first:  export PAT=ghp_xxxx"
  exit 1
fi

REPO="https://${PAT}@github.com/dferdowsfy/taxTool.git"

echo "📦  Installing dependencies..."
npm install

echo "🔨  Building..."
npm run build

echo "🔧  Initialising git..."
git init
git config user.email "darius@kaptrix.com"
git config user.name "Darius Ferdows"
git add -A
git commit -m "feat: initial Kaptrix tax optimizer"

echo "🚀  Pushing main branch..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO"
git branch -M main
git push -u origin main --force

echo "🌐  Deploying to GitHub Pages..."
npx gh-pages -d dist -r "$REPO"

echo ""
echo "✅  Done!"
echo "   Repo   → https://github.com/dferdowsfy/taxTool"
echo "   Live   → https://dferdowsfy.github.io/taxTool/"
echo "   (Pages takes ~60s to go live on first deploy)"
