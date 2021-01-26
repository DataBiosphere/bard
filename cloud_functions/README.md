# Bard - Cloud Functions
Cloud functions related to metrics

## Overview
This is a collection of cloud functions that augment the core bard service. The main service is a set of endpoints intended to be called from clients, either anonymously or with an access token that identifies the user performing the action. The cloud functions here may have other triggers, such as a Google Pub/Sub message.

## Function Documentation

### `flagCryptominer`
`flagCryptominer` watches for messages on the `broad-dsde-[env]/topics/terra-cryptomining` Pub/Sub topic containing IDs of identified cryptominer accounts and sets the "Is Cryptominer" flag in their Mixpanel profile to `true`.

## Deployment
```sh
gcloud --project terra-bard-[env] functions deploy flagCryptominer --runtime nodejs12 --trigger-http
```
