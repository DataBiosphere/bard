const { Logging } = require('@google-cloud/logging')
const { BigQuery } = require('@google-cloud/bigquery')
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager')
const { bigQueryProject, bigQueryDatasetId, bigQueryTableId  } = require('../config')

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
      console.error(`Could not write ${JSON.stringify(message)} to ${logName} in stackdriver: ${JSON.stringify(error)}`)
    }
  }
}

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

// https://cloud.google.com/bigquery/docs/creating-partitioned-tables
async function createBigQueryTable(datasetId, tableId) {
  const schema = 'event:string, method:string, path:string, appId:string, distinctId:string, properties:JSON'
  const options = {
    schema: schema,
    location: 'US',
    timePartitioning: {
      type: 'DAY',
      expirationMS: '7776000000'
    }
  }
  const [table] = await bigquery
    .dataset(datasetId)
    .createTable(tableId, options)
  console.log(`Table ${table.id} created with partitioning: `)
  console.log(table.metadata.timePartitioning)
}

async function createBigQueryTableIfNotExists(datasetId, tableId) {
  const dataset = bigquery.dataset(datasetId)
  const table = dataset.table(tableId)
  try {
    await table.get()
  } catch (e) {
    if (e.code === 404) {
      console.log(`${e.message} >>> Creating table: ${tableId}`)
      await createBigQueryTable(datasetId, tableId)
    }
  }
}

const bigquery = new BigQuery({ projectId: bigQueryProject })
async function insertRowsAsStream(data) {
  const datasetId = bigQueryDatasetId
  const tableId = bigQueryTableId
  await createBigQueryTableIfNotExists(datasetId, tableId)
  console.log(`Storing event data in BigQuery dataset ${datasetId}:${tableId}`)
  const properties = data['properties']
  await bigquery
    .dataset(datasetId)
    .table(tableId)
    .insert([
      {
        'event': data['event'],
        'method': properties['method'],
        'path': properties['path'],
        'appId': properties['appId'],
        'distinctId': properties['distinctId'],
        'properties': JSON.stringify(properties)
      }
    ])
}

module.exports = {
  logger,
  getSecret,
  insertRowsAsStream
}
