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

// TODO: Share this code with the bard GAE app (will probably require a more sophisticated build/deploy process).
// However, this implementation is slightly different in that it lets exceptions escape. This is
// appropriate for how it's used in the context of this Cloud Function, but might not be appropriate
// for use in the GAE app or may require changes to the app. Letting exceptions escape instead of
// returning a magic null value is a simpler, better expression of the behavior. That makes it worth
// diverging the code now. Future de-duplication efforts should consider using this simpler
// implementation in both places.
const getSecret = async ({ project, secretName }) =>  {
  const client = new SecretManagerServiceClient()
  const name = `projects/${project}/secrets/${secretName}a/versions/latest`

  const [version] = await client.accessSecretVersion({ name })
  return version.payload.data.toString('utf8')
}


module.exports = {
  coerceToError,
  getSecret
}
