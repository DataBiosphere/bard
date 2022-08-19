# Bard 
Metrics Collection Service

(Why is the service called Bard? It’s a metric system → metric system uses meters → poets use meters → bards are poets → bards tell stories (kind of what we are doing))


## Overview
Bard is a service that accepts requests from a client application for the purpose of capturing, logging, and working with user events then, forwarding relevant data to Mixpanel, a user analytics third party system. Mixpanel is then used to learn about the behavior of the folks utilizing the client application so developers can better suit the users needs. Below are API endpoints you can integrate into your code to utilize this service in your own application. 

## Typical Usage
#### Example use case 1: 
Terra-UI uses the `/api/event` endpoint with registered users to send user event data such as: the page a user views, data from when a user launches an analysis tool, or when a user shares data with another user, etc. This gives the Terra-UI team insight into what users do most often in the application which, gives the team intuition about where they might focus thier efforts on new fetures. This also allows the Terra-UI team to see where users fall-off or stop using the application which, can help determine what areas of the application need improvement. 
 
#### Example use case 2: 
Single-Cell-Portal (SCP) uses the `/api/event` with both registered and unregistered users, and the `/api/identify` endpoint. Since SCP has features users can use before signing up, SCP tracks user event data when a user isn't signed in as well as user event data from when the user eventually signs in using the `/api/event` endpoint. SCP then leverages the `/api/identify` endpoint to merge the data that has been tracked for a user before the user has signed in with the data from once that user does sign-in, giving SCP a full picture of each users interactions with the application.

For more info on how to leverage Mixpanel for your needs check out the documentation here: https://help.mixpanel.com/hc/en-us/categories/115001209063-Analysis.

## Developing
Note that there is currently no separate development environment for mixpanel, so any changes will affect the real system. If you enable the mixpanel API with a token, events will get pushed to mixpanel. Use caution.

1. Create a new key for the app engine default service account terra-bard-dev@appspot.gserviceaccount.com. This will cause a JSON file to be downloaded to your machine. Note its location.
2. Install the dependencies

    ```sh
    yarn install
    ```
3. To run bard locally you need to create a config.json in the root directory as there is no specified default config.
   To do so, run the following command in the terminal from within your local bard repo. (This will copy the dev config to a root version of config.json):
   
   ```sh
   cp config/dev.json config.json
   ``` 
4. Start a dev server on port 8080 with auto-reload

    ```sh
    GCP_PROJECT=terra-bard-dev GOOGLE_APPLICATION_CREDENTIALS=<path-to-key-file> yarn run start-dev
    ```
5. Lint any code changes using 

    ```sh
    yarn run lint
    ```

## Deploying
**Note**: The deploy process will overwrite any `./config.json` you may currently be using. Before running these scripts, make a backup of this file if you have any interesting config that you'd like to preserve (i.e. not just unmodified copies of files in `./config/`).

Bard deployment is fully manual. You must have the repo cloned locally. There are 2 scripts in `./scripts/`:
* `deploy-all-but-prod.sh`: Deploys to dev, alpha, perf, and staging using their respective config files in `./config/`. Run this with your @broadinstitute.org account.
* `deploy-prod.sh`: Deploys to prod using `./config/prod.json`. Run this with your @firecloud.org account.

Both of these scripts run
```sh
yarn install
yarn list
yarn generate-docs
```
prior to deploying to make sure that local assets are up-to-date. They then use `gcloud app deploy` to deploy a new version of the Google AppEngine app; make sure you have the correct account active for the environment(s) you're deploying.

To use these scripts:
1. Make sure your local clone is up-to-date with the remote `dev` branch.
2. Back-up your local `./config.json` if you want to keep it.
3. Select which of the above scripts you need to run. Note the Google account needed.
4. Make sure that `gcloud auth list` indicates that your account is active based on the requirements listed above.
5. Run the script, e.g. `./scripts/deploy-all-but-prod.sh`.
6. (optional) Restore your preferred `./config.json`.

The script will copy the appropriate config files out of `./config/` as needed, overwriting `./config.json`. At the end, the script will delete `./config.json` to prevent you from accidentally running Bard locally with an unexpected config. Once the script is done, you can restore whatever `./config.json` you need.

## Working with the track user event endpoint:
#### Notes:
- This endpoint optionally requires an authorization header, see below for each use case.
- When adding your own events please be sure to update the Lexicon in Mixpanel with the meaning of your events and property names. (E.x. Terra-UI added an event called `Workspace:Share` with a property called `numAdditions`. Updating the Lexicon on Mixpanel gives a description of each of these letting folks know that a `Workspace:Share` event occurs when a workspace is shared with at least one new person and that the `numAdditions` is the count of the users that the workspace was shared with.)

### Unregistered User Event Endpoint:
This version of the endpoint does not require an authorization header. This is for use with users that are not signed into the application or have never registered and are considered anonymous users. This endpoint will then forward the event data for these users to Mixpanel identifying the user by a unique UUID4 id that your client application must provide to Bard.

Example: 
		
		My website lets users who are not signed in view job applications. I want to know how many
		people are looking at my job applications. Tracking unregistered users allows me to see the
		full picture for my features that are accessible to unsigned in users.

### Registered User Event Endpoint:
This version of the endpoint does require an authorization header. This is for use with users that are registered and currently signed into the application. This endpoint will verify user identification with Sam and forward the event data for these users to Mixpanel anonymizing the user identification before passing along to Mixpanel. Please note for a registered user you CANNOT send a user id, this must be sent implicitly by the user being signed in. This is to prevent fraudulent user ids from being passed.

Example:
        
        My website has lots of functionality only available to logged in users. I want to be able to 
        see what my logged in users are doing and I want to be confident that I am seeing data only 
        for people signed into my site. Using this endpoint I can find out that information.


## Working with the identify endpoint:
This endpoint requires an authorization header. It also requires the user to be signed in. Once a user is signed in you can utilize this endpoint by sending the UUID4 that was the distinct id for the anonymous user that you want to be associated with this signed in user. Bard will then pass along the needed data to Mixpanel so that the correlation between the user as an unregistered user and a signed-in one will be made.

Example:
        There is a feature on my application for a user to send in a question to the support team.
        Users do not need to be signed in to use this feature. 
        
        User A comes to my application and has a question so they reach out to the support team. 
        They then decide they want to register for the application while waiting for the response. 
        So User A registers and logs-in. Once inside the application User A realizes the answer to their 
        question by trying out the application. Support gets back to them and User A responds that
        they figured out the answer by playing around on the site. Now if the application used the
        identify endpoint on registration the support team can use Mixpanel to find out what the
        user did to answer thier own question which might help the Support team create helpful documents for
        new users in the future.
       

## Working with the Sync Profile endpoint:
This endpoint does require an authorization header and is used to sync up the anonymized user info in Mixpanel with the user info in Orchestration.
Since the syncProfile call is idempotent, it's acceptable to call repeatedly (e.g. on every login from the front end) in order to simplify the process of creating profiles for existing users.


Example:
       
       Everytime any user signs in to my application I call the Sync Profile endpoint so that the user info
       that is recorded through Orchestration will be correlated with the user info that is sent
       to Mixpanel.
   
## Documentation
  To generate the [API docs](https://terra-metrics-dev.appspot.com/docs) run

  ```sh 
    yarn run generate-docs
  ```
