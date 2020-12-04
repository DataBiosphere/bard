const { project } = require('./config')
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager')
const fetch = require('node-fetch')


const flagCryptominer = async (message, context) => {
  const data = JSON.parse(Buffer.from(message.data, 'base64').toString())
  const token = await getSecret({ project, secretName: 'mixpanel-api' })
  return fetchMixpanelV2('engage#profile-set', {
    data: {
      $token: token,
      $distinct_id: `google:${data.googleSubjectId}`,
      $set: {
        'Is Cryptominer': true
      }
    }
  })
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

class Response {
  constructor(status, data) {
    this.status = status
    this.data = data
  }
}

const fetchOk = async (url, { serviceName, ...options } = {}) => {
  const res = await fetch(url, options).catch(() => {
    throw new Response(503, `Unable to contact ${serviceName} service`)
  })
  if (res.status === 401) {
    throw new Response(401, 'Unauthorized')
  }
  if (!res.ok) {
    console.error(`${serviceName} error`, await res.text())
    throw new Response(503, `Failed to query ${serviceName} service`)
  }
  return res
}

// Note that this is different than fetchMixpanel used in the bard GAE app.
// This uses a newer version of the Mixpanel API because I was not able to
// locate any documentation for the old API, which I would have preferred
// for consistency. -breilly
const fetchMixpanelV2 = async (url, { data, ...options } = {}) => {
  const body = new URLSearchParams({ data: JSON.stringify(data) })
  const res = await fetchOk(`https://api.mixpanel.com/${url}`,
      { serviceName: 'metrics', method: 'POST', body, ...options })
  const status = await res.text()
  if (status !== '1') {
    console.error(`Failed to log to mixpanel:`, status, data)
    throw new Response(400, 'Error saving metrics data')
  }
}

module.exports = {
  flagCryptominer
}
