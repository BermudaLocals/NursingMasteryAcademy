#!/bin/bash
set -e
REPO="https://github.com/BermudaLocals/NursingMasteryAcademy.git"
DIR="NursingMasteryAcademy"
if [ -d "$DIR" ]; then cd $DIR; git pull; cd ..; else git clone $REPO; fi
echo "Copying bundle to repo..."
cp -r NMA_Bundle/* $DIR/
cd $DIR
git add .
git status
git commit -m "feat: US-compliant 3-tier rebuild with demo videos + creator credits - Foundations $97, Clinical Mastery $297, Pro Vault $497 - NCSBN CJMM, iOS fallback, legal disclaimers" || echo "No changes"
echo "Pushing to https://github.com/BermudaLocals/NursingMasteryAcademy"
echo "You will be prompted for GitHub credentials or use gh auth login"
git push origin main
