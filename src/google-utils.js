const { Logging } = require('@google-cloud/logging')
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager')

const logger = ({ project, logName, type = 'global' }) => {
  const logging = new Logging({ projectId: project })
  const log = logging.log(logName)
  const metadata = {
    resource: { type }
  }

  return async message => {
    try {
      await log.write(log.entry(metadata, message))
    } catch (error) {
      console.error(`Could not write ${JSON.stringify(message)} to stackdriver`)
    }
  }
}

const getSecret = async ({ project, secretName }) =>  {
  const client = new SecretManagerServiceClient()
  const name = `projects/${project}/secrets/${secretName}/versions/latest`

  try {
    const [version] = await client.accessSecretVersion({ name: name })
    return version.payload.data.toString('utf8')
  } catch (error) {
    return null
  }
}

module.exports = {
  logger,
  getSecret
}
