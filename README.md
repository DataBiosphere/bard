# Bard 
Metrics Collection Service

## Overview
This service will accept requests from a client application for the purposes of logging user actions and forwarding
them to to an analytics service so we can determine how our users utilize our applications

## Typical Usage
1. Call ```event``` to log a user's action and send the event to mixpanel.

      Only event on the production system will be sent to mixpanel

## Authentication
1. The service will only accept requests from users who are registered with our application

## Developing
Note that there is currently no separate development environment, so any changes will affect the real system (e.g. if you enable the mixpanel API with a token, events will get pushed to mixpanel). Use caution.

1. Download a key for the app engine default service account terra-metrics-dev@appspot.gserviceaccount.com and note the location
2. Install the dependencies
   
    ```sh
    yarn install
    ```

3. Start a dev server on port 8080 with auto-reload

    ```sh
    GCP_PROJECT=terra-dev-metrics GOOGLE_APPLICATION_CREDENTIALS=<path-to-key-file> yarn run start-dev
    ```

4. Lint any code changes using 
    ```sh
    yarn run lint
    ```
   
## Documentation
  To generate the [API docs](https://terra-metrics-dev.appspot.com/docs) run

  ```sh 
    yarn run generate-docs
  ```
   