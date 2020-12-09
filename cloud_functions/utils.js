const { SecretManagerServiceClient } = require('@google-cloud/secret-manager')


// Used to make sure console.error() is given an Error in order to invoke Cloud Logging Error Reporting
// See https://cloud.google.com/functions/docs/monitoring/error-reporting
const coerceToError = e => {
  if (!(e instanceof Error)) {
    return new Error(`Non-Error thrown: ${e.toString()}`)
  } else {
    return e
  }
}

// Mixpanel SDK callback to log to console.error
const logMixpanelError = error => {
  if (error) {
    console.error(coerceToError(error))
  }
}

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


module.exports = {
  coerceToError,
  getSecret,
  logMixpanelError
}
