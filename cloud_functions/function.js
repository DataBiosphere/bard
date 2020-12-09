const _ = require('lodash/fp')
const { project } = require('./config')
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager')
const Mixpanel = require('mixpanel')


const getMixpanel = _.once(async () => {
  console.log('Cold start; initializing mixpanel')
  const token = await getSecret({ project, secretName: 'mixpanel-api' })
  return Mixpanel.init(token)
})

const flagCryptominer = async (message, context) => {
  try {
    if (!(message.attributes && message.attributes.cryptominer === true)) {
      console.error(new Error('Unexpected message; missing `cryptominer: true` attribute. Is the Pub/Sub subscription set up correctly?'))
      return
    }
    const data = message.data && JSON.parse(Buffer.from(message.data, 'base64').toString())
    if (!(data && data.userSubjectId)) {
      console.error(new Error('Invalid message: missing userSubjectId'))
      return
    }

    // TODO: move this out of the try/catch? What happens if a _.once wrapped function throws an error?
    const mixpanel = await getMixpanel()
    mixpanel.people.set(`google:${data.userSubjectId}`, { 'isCryptominer': true }, logMixpanelError)

  } catch (error) {
    if (error instanceof Error) {
      console.error(error)
    } else {
      console.error('Unexpected error', new Error(error.toString()))
    }
  }
}


// Utilities

// TODO: Share this code with the bard GAE app (will probably require a more sophisticated build/deploy process)
const getSecret = async ({ project, secretName }) =>  {
  const client = new SecretManagerServiceClient()
  const name = `projects/${project}/secrets/${secretName}/versions/latest`

  try {
    const [version] = await client.accessSecretVersion({ name })
    return version.payload.data.toString('utf8')
  } catch (error) {
    return null
  }
}

// Log to console.error instead of throwing uncaught exceptions.
// See https://cloud.google.com/functions/docs/monitoring/error-reporting
const logMixpanelError = (message, err) => {
  if (err) {
    console.error(message, err)
  }
}


module.exports = {
  flagCryptominer
}
