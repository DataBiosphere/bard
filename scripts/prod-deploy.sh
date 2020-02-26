#!/usr/bin/env bash
set -eo pipefail
yarn install
yarn lint
yarn generate-docs
cp config/config.prod.json ./
gcloud app deploy --project=terra-bard-prod