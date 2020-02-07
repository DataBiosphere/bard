const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { promiseHandler, Response } = require('./utils')
const { project, samRoot, mixPanelRoot } = require('../config')
const { logger, getSecret } = require('./google-utils')
const btoa = require('btoa-lite')
const fetch = require('node-fetch')


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
    await fetch(`${mixPanelRoot}/track?data=${data}`)
  } catch (error) {
    console.error(`Failed to log ${data} to mixpanel`)
  }
}

const main = async () => {
  const token = await getSecret({ project, secretName: 'mixpanel-test-api' })
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

  /**
   * @api {post} /event System status
   * @apiDescription Records the event to a log and forwards it to mixpanel
   * @apiName event
   * @apiVersion 1.0.0
   * @apiGroup Events
   * @apiParam {String} event Name of the event
   * @apiParam {String} properties Properties associated with this event
   * @apiSuccess (Success 200) -
   */
  app.post('/api/event', promiseHandler(withAuth(async req => {
    const { event, properties } = req.body

    log(req.body)
    token && sendToMixpanel(token, event, properties)

    return new Response(200, { event, properties })
  })))
}

main().catch(console.error)

