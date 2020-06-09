# Bard 
Metrics Collection Service

## Overview
Bard is a service that accepts requests from a client application for the purpose of capturing, logging, and working with user events, forwarding relevant data to Mixpanel, a user analytics third party system. Mixpanel is then used to learn about the behavior of the users utilizing our applications so we can better suit their needs. Below are API endpoints you can integrate into your code to utilize this service in your own application. 

(Why is the service called Bard? It’s a metric system → metric system uses meters → poets use meters → bards are poets → bards tell stories (kind of what we are doing))


## Typical Usage
#### Example use case 1: 
Terra-UI uses the registered-user-event-endpoint to send user event data such as: the page a user views, the info when a user launches an analysis tool, or when a user shares data with another user, etc. This gives the Terra-UI team insight into what users do most often in the application which, gives the team intuition about where they might focus thier efforts on new fetures. This also allows the Terra-UI team to see where users fall-off or stop using the application which, can help determine what areas of the application need improvement. 
 
#### Example use case 2: 
Single-Cell-Portal, SCP, uses the registered-user-event-endpoint, unregistered-user-event-endpoint, and the identify-users-endpoint. Since SCP has features users can use before signing up, so SCP tracks user event data when a user isn't signed in as well as user event data from when the user eventually signs in. SCP then leverages the identify-endpoint to merge the data that has been tracked for a user before the user has signed in with the data from once that user does sign-in, giving SCP a full picture of each users interactions with the application.

For more info on how to leverage Mixpanel for your needs check out the documentation here: https://help.mixpanel.com/hc/en-us/categories/115001209063-Analysis.

## Developing
Note that there is currently no separate development environment for mixpanel, so any changes will affect the real system. If you enable the mixpanel API with a token, events will get pushed to mixpanel. Use caution.

1. Download a key for the app engine default service account terra-metrics-dev@appspot.gserviceaccount.com and note the location
2. Install the dependencies
   
    ```sh
    yarn install
    ```

3. Start a dev server on port 8080 with auto-reload

    ```sh
    GCP_PROJECT=terra-bard-dev GOOGLE_APPLICATION_CREDENTIALS=<path-to-key-file> yarn run start-dev
    ```

4. Lint any code changes using 
    ```sh
    yarn run lint
    ```
   
##Working with the track user event endpoint:
####Notes:
- This endpoint optionally requires an authorization header, see below for each use case.
- When adding your own events please be sure to update the Lexicon in Mixpanel with the meaning of your events and property names. (E.x. Terra-UI added an event called Workspace:Share with a property called numAdditions. Updating the Lexicon on Mixpanel gives a description of each of these letting folks know that a Workspace:Share event occurs when a workspace is shared with at least one new person and that the numAdditions is the count of the users that the workspace was shared with.)

###Unregistered User Event Endpoint:
This version of the endpoint does not require an authorization header. This is for use with users that are not signed into the application or have never registered and are considered anonymous users. This endpoint will then forward the event data for these users to Mixpanel identifying the user by a unique UUID4 id that your client application must provide to Bard.

Example: 
		
    Request URL: https://terra-bard-dev.appspot.com/api/event
    Request Method: POST
    Request Payload: 
                { 'event name', 
                    properties: { hostname: 'url name', distinct_id: 'A UUID4 string'}
                }

###Registered User Event Endpoint:
This version of the endpoint does require an authorization header. This is for use with users that are registered and currently signed into the application. This endpoint will verify user identification with Sam and forward the event data for these users to Mixpanel anonymizing the user identifiction before passing along to Mixpanel. Please note for a registered user you CANNOT send a user id, this must be sent implicitly by the user being signed in. This is to prevent fradulent user id's from being passed.

Example:

    Request URL: https://terra-bard-dev.appspot.com/api/event
    Request Method: POST
    authorization: Bearer token
    Request Payload: 
                { 'event name', 
                    properties: { hostname: 'url name'}
                }

##Working with the identify endpoint:
This endpoint requires an authorization header. It also requires the user to be signed in. Once a user is signed in you can utilize this endpoint by sending the UUID4 that was the distinct id for the anonymous user that you want to be associated with this signed in user. This endpoint will then pass along the needed data to Mixpanel so that the correlation between the user as an unregistered user and a signed-in one will be made.

Example:
        
        Request URL: https://terra-bard-dev.appspot.com/api/identify
        Request Method: POST
        authorization: Bearer token
        Request Payload: 
                        { Event_Name, 
                            { anonId: 'A UUID4 string'}
                        }

##Working with the Sync Profile endpoint:
This endpoint does require an authorization header. 

Example:

    oihuj
   
## Documentation
  To generate the [API docs](https://terra-metrics-dev.appspot.com/docs) run

  ```sh 
    yarn run generate-docs
  ```
