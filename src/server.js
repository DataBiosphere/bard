const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { promiseHandler, Response, validateInput } = require('./utils')
const { project, samRoot } = require('../config')
const { logger, getSecret } = require('./google-utils')
const btoa = require('btoa-lite')
const fetch = require('node-fetch')
const Joi = require('@hapi/joi')


const withAuth = wrappedFn => async (req, ...args) => {
  const authRes = await fetch(
    `${samRoot}/register/user/v2/self/info`,
    { headers: { authorization: req.headers.authorization } }
  ).catch(() => {
    throw new Response(503, 'Unable to contact auth service')
  })

  if (authRes.status === 401) {
    throw new Response(401, 'Unauthorized')
  }

  if (!authRes.ok) {
    console.error('Sam error', await authRes.text())
    throw new Response(503, 'Failed to query auth service')
  }

  const { enabled } = await authRes.json()
  if (!enabled) {
    throw new Response(403, 'Forbidden')
  }
  return wrappedFn(req, ...args)
}

const sendToMixpanel = async (token, event, props) => {
  const data = btoa(JSON.stringify({ event, properties: { token, ...props } }))
  try {
    await fetch(`https://api.mixpanel.com/track?data=${data}`)
  } catch (error) {
    console.error(`Failed to log ${data} to mixpanel`)
  }
}

const main = async () => {
  const token = await getSecret({ project, secretName: 'mixpanel-api' })
  const log = logger({ project, logName: 'metrics' })

  const app = express()
  app.use(bodyParser.json())
  app.use(cors())
  app.use('/docs', express.static('docs'))

  app.listen(process.env.PORT || 8080)

  /**
   * @api {get} /status System status
   * @apiName status
   * @apiVersion 1.0.0
   * @apiGroup System
   * @apiSuccess (Success 200) -
   */
  app.get('/status', promiseHandler(async () => {
    return new Response(200)
  }))

  const eventSchema = Joi.string().required()
  const propertiesSchema = Joi.object({
    userId: Joi.string().required(),
    appId: Joi.string().required(),
    appPath: Joi.string().required(),
    timestamp: Joi.date().timestamp().required()
  }).required().unknown(true)

  /**
   * @api {post} /event Log a user event
   * @apiDescription Records the event to a log and forwards it to mixpanel
   * @apiName event
   * @apiVersion 1.0.0
   * @apiGroup Events
   * @apiParam {String} event Name of the event
   * @apiParam {Object} properties Properties associated with this event. The below fields are required. Additional application defined fields can also be used
   * @apiParam {String} properties.userId The anonymized ID of the user
   * @apiParam {String} properties.appId The application
   * @apiParam {String} properties.appPath The navigational path in the application the user is on, with identifying parameters removed
   * @apiParam {Date} properties.timestamp Timestamp of the event
   * @apiSuccess (Success 200) -
   */
  app.post('/api/event', promiseHandler(withAuth(async req => {
    const { event, properties } = req.body

    validateInput(req.body, Joi.object({ event: eventSchema, properties: propertiesSchema }))

    log(req.body)
    token && sendToMixpanel(token, event, properties)

    return new Response(200)
  })))
}

main().catch(console.error)

