#!/usr/bin/env bash
set -eo pipefail
yarn install
yarn lint
yarn generate-docs
cp config/prod.json config.json
gcloud app deploy --project=terra-bard --promote --quiet
rm config.json