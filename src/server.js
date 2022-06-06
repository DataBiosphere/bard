const _ = require('lodash/fp')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { promiseHandler, Response, validateInput } = require('./utils')
const { project, orchestrationRoot, samRoot } = require('../config')
const { logger, getSecret } = require('./google-utils')
const btoa = require('btoa-lite')
const fetch = require('node-fetch')
const Joi = require('@hapi/joi')

const userDistinctId = user => {
  return `google:${user.userSubjectId}`
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

const fetchMixpanel = async (url, { data, ...options } = {}) => {
  const res = await fetchOk(
    `https://api.mixpanel.com/${url}?data=${btoa(JSON.stringify(data))}`,
    { serviceName: 'metrics', ...options }
  )
  const status = await res.text()
  if (status !== '1') {
    console.error(`Failed to log to mixpanel:`, data)
    throw new Response(400, 'Error saving metrics data')
  }
}

const verifyAuth = async req => {
  const res = await fetchOk(
    `${samRoot}/register/user/v2/self/info`,
    { headers: { authorization: req.headers.authorization }, serviceName: 'auth' }
  )
  req.user = await res.json()
  if (!req.user.enabled) {
    throw new Response(403, 'Forbidden')
  }
}

const withAuth = wrappedFn => async (req, ...args) => {
  await verifyAuth(req)
  return wrappedFn(req, ...args)
}

const withOptionalAuth = wrappedFn => async (req, ...args) => {
  if (req.headers.authorization) {
    await verifyAuth(req)
  }
  return wrappedFn(req, ...args)
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

  const eventSchema = Joi.string().pattern(/^\$/, { invert: true }).required()
  const propertiesSchema = Joi.object({
    token: Joi.any().forbidden(),
    'distinct_id': Joi.string().alter({
      unauthenticated: schema => schema.guid({ version: 'uuidv4' }).required(),
      authenticated: schema => schema.forbidden()
    }),
    time: Joi.any().forbidden(),
    ip: Joi.any().forbidden(),
    name: Joi.any().forbidden(),
    appId: Joi.string().required()
  }).pattern(Joi.string().pattern(/^(\$|mp_)/, { invert: true }), Joi.any().required()).required()

  const identifySchema = Joi.string().guid({ version: 'uuidv4' }).required()

  const delay = ms => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * @api {post} /api/event Log a user event
   * @apiDescription Records the event to a log and forwards it to mixpanel. Optionally takes an authorization token which must be verified with Sam
   * @apiName event
   * @apiVersion 1.0.0
   * @apiGroup Events
   * @apiParam {String} event Name of the event
   * @apiParam {Object} properties Properties associated with this event. Additional application defined fields can also be used.
   * @apiParam (Unregistered) {String{uuid4}} properties.distinct_id The id of the anon user required for client to pass if user is unregistered (forbidden if user is registered)
   * @apiParam {String} properties.appId The application
   * @apiSuccess (Success 200) -
   */
  app.post('/api/event', promiseHandler(withOptionalAuth(async req => {
    validateInput(req.body, Joi.object({
      event: eventSchema,
      properties: propertiesSchema.tailor(req.user ? 'authenticated' : 'unauthenticated')
    }))

    const data = _.update('properties', properties => ({
      ...properties,
      token,
      'distinct_id': req.user ? userDistinctId(req.user) : properties.distinct_id
    }), req.body)

    /**
     * Temporary code to ignore the 'request:failed' event and delay the repsonse to
     * slow the browser requests down and reduce the errors, and getting the client out of
     * the degenerative state
     */
    const { event } = req.body
    if (event === 'request:failed') {
      const failedRequestData = _.update('properties', properties => ({
        ...properties,
        event: event
      }), data)
      log(failedRequestData)
      await delay(10000)
      return new Response(200)
    }

    await Promise.all([
      log(data),
      token && fetchMixpanel('track', { data })
    ])
    return new Response(200)
  })))

  /**
   * @api {post} /api/identify Merge two user id's
   * @apiDescription Calls MixPanel's `$identify` endpoint to merge the included distinct_ids. This merges the client generated id, used for anonymous, non-authenticated metrics with the Bard auto-generated `distinct_id` to link an anonymous session with a user. Requires an authorization token that is verified with Sam
   * @apiName identify
   * @apiVersion 1.0.0
   * @apiGroup Events
   * @apiParam {String} anonId The distinct id of an anonymous user, this is required
   * @apiSuccess (Success 200) -
   */
  app.post('/api/identify', promiseHandler(withAuth(async req => {
    validateInput(req.body, Joi.object({ anonId: identifySchema }))

    const data = {
      event: '$identify',
      properties: {
        '$identified_id': userDistinctId(req.user),
        '$anon_id': req.body.anonId,
        token
      }
    }
    await Promise.all([
      log(data),
      token && fetchMixpanel('track', { data })
    ])
    return new Response(200)
  })))

  /**
   * @api {post} /api/syncProfile Update mixpanel profile
   * @apiDescription Syncs profile info from orchestration to mixpanel. Requires an authorization token, which pulls the corresponding profile from Orchestration to sync into mixpanel
   * @apiName syncProfile
   * @apiVersion 1.0.0
   * @apiGroup Profile
   * @apiSuccess (Success 200) -
   */
  app.post('/api/syncProfile', promiseHandler(async req => {
    const res = await fetchOk(
      `${orchestrationRoot}/register/profile`,
      { headers: { authorization: req.headers.authorization }, serviceName: 'profile' }
    )
    const { userId, keyValuePairs } = await res.json()
    const email = _.get('value', _.find({ key: 'anonymousGroup' }, keyValuePairs))
    const data = {
      '$token': token,
      '$distinct_id': `google:${userId}`,
      '$set': { '$email': email }
    }
    if (token) {
      await fetchMixpanel('engage', { data })
    }
    return new Response(200)
  }))
}

main().catch(console.error)
