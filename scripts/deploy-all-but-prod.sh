#!/usr/bin/env bash
set -eo pipefail
yarn install
yarn run lint
yarn run generate-docs

for TERRA_ENV in dev alpha perf staging ; do
    cp config/$TERRA_ENV.json config.json
    gcloud app deploy --project=terra-bard-$TERRA_ENV --promote --quiet
done

rm config.json
