#!/bin/bash
cd "$(dirname "$0")" || exit 1
if command -v node >/dev/null 2>&1; then
  node pipeline/server.cjs
elif [ -x '/Applications/Visual Studio Code.app/Contents/MacOS/Code' ]; then
  ELECTRON_RUN_AS_NODE=1 '/Applications/Visual Studio Code.app/Contents/MacOS/Code' pipeline/server.cjs
else
  echo 'Install Node.js from https://nodejs.org, then run this file again.'
  read -r
fi
