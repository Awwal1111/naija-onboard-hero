#!/bin/bash

# Script to set up Naija Onboard API SDK repository
# Run this after creating the GitHub repository

echo "🚀 Setting up Naija Onboard API SDK Repository"

# Check if we're in the right directory
if [ ! -d "naija-api-sdk" ]; then
    echo "❌ Error: naija-api-sdk directory not found"
    echo "Please run this script from the naija-onboard-hero workspace root"
    exit 1
fi

cd naija-api-sdk

# Add remote origin (replace YOUR_USERNAME with actual GitHub username)
echo "📝 Adding GitHub remote..."
echo "Please replace 'Awwal1111' with your GitHub username in the next command:"
echo "git remote add origin https://github.com/YOUR_USERNAME/naija-onboard-api-sdk.git"

# Push to GitHub
echo "⬆️ Pushing to GitHub..."
git branch -M main
git push -u origin main

echo "✅ Repository setup complete!"
echo ""
echo "📦 To publish to NPM:"
echo "1. cd naija-api-sdk"
echo "2. npm login"
echo "3. npm publish"
echo ""
echo "🔗 Repository URL: https://github.com/Awwal1111/naija-onboard-api-sdk"
echo "📖 Documentation: https://naija-onboard-hero.vercel.app/developers"