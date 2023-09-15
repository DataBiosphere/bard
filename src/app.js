const _ = require('lodash/fp')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { promiseHandler, Response, validateInput, redirectHandler, fetchOk, delay } = require('./utils')
const { fetchMixpanel } = require('./mixpanel-utils')
const { verifyAuth } = require('./sam-utils')

// We can't really mock since there is by default no config file
const { project, orchestrationRoot } = require('./config')

const { logger, getSecret } = require('./google-utils')
const Joi = require('joi')
const swaggerUi = require('swagger-ui-express')
const swaggerDocument = require('../docs/swagger.json')
const { getAccountType, getEmailDomain } = require('./account-type-utils')

const userDistinctId = user => {
  return `google:${user.userSubjectId}`
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

/**
 * Decorate the data being logged with internal properties. These properties are not sent to mixpanel but only
 * logged so that they make their way to the DW. Using snake case for terra_user to match mixpanel properties
 * like `distinct_id`
 */
const decorateWithInternalProperties = (req, data) => {
  const privateProperties = { properties: { 'terra_user_id': _.get('user.userSubjectId', req) } }
  return _.merge(data, privateProperties)
}

/**
 * Temporary wrapper to ignore the 'request:failed' event and delay the response to
 * slow the browser requests down and reduce the errors, and getting the client out of
 * the degenerative state. This wrapper will prevent calls to sam.
 * Ticket: https://broadworkbench.atlassian.net/browse/BT-667
 */
const withBadEventHandling = (log, wrappedFn) => async (req, ...args) => {
  const { event } = req.body

  if (event === 'request:failed') {
    const data = _.update('properties', properties => ({
      ...properties,
      event,
      'distinct_id': req.user ? userDistinctId(req.user) : properties.distinct_id
    }), req.body)

    log(decorateWithInternalProperties(req, data))
    await delay(10000)
    return new Response(200)
  } else {
    return wrappedFn(req, ...args)
  }
}

/*
 * Note: the app object may be being constructed when used from another module.
 */
const app = express()

const main = async () => {
  const token = await getSecret({ project, secretName: 'mixpanel-api' })
  const log = logger({ project, logName: 'metrics' })

  app.use(bodyParser.json())
  app.use(cors())
  app.use('/docs', express.static('docs'))
  // Host the swagger ui
  const options = {
    explorer: true
  }
  app.use('/swagger', swaggerUi.serve,   swaggerUi.setup(swaggerDocument, options))
  // Redirect the root to the swagger ui
  app.get('/', redirectHandler('/swagger'))
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    next()
  })

  /**
   * @api {get} /status System status
   * @apiName status
   * @apiVersion 1.0.0
   * @apiGroup System
   * @apiSuccess (200) {String} response An empty string
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

  /**
   * @api {post} /api/event Log a user event
   * @apiDescription Records the event to a log and optionally forwards it to mixpanel. Optionally takes an authorization token which must be verified with Sam.
   *                 If properties['pushToMixpanel'] is false, only log the event (the property defaults to true). The logs will still get sent to BigQuery via a log sink.
   * @apiName event
   * @apiVersion 1.0.0
   * @apiGroup Events
   * @apiParam {String} event Name of the event
   * @apiParam {Object} properties Properties associated with this event. Additional application defined fields can also be used.
   * @apiParam (Unregistered) {String{uuid4}} properties.distinct_id The id of the anon user required for client to pass if user is unregistered (forbidden if user is registered)
   * @apiParam {String} properties.appId The application
   * @apiSuccess (200) {String} response An empty string
   */
  app.post('/api/event', promiseHandler(withBadEventHandling(log, withOptionalAuth(async req => {
    validateInput(req.body, Joi.object({
      event: eventSchema,
      properties: propertiesSchema.tailor(req.user ? 'authenticated' : 'unauthenticated')
    }))
    const data = _.update('properties', properties => ({
      ...properties,
      token,
      'distinct_id': req.user ? userDistinctId(req.user) : properties.distinct_id
    }), req.body)
    const properties = data['properties']
    const promises = [log(decorateWithInternalProperties(req, data))]
    const pushToMixpanel = properties['pushToMixpanel'] !== false
    if (pushToMixpanel) {
      promises.push(token && fetchMixpanel('track', { data }))
    }
    await Promise.all(promises)
    return new Response(200)
  }))))

  /**
   * @api {post} /api/identify Merge two user id's
   * @apiDescription Calls MixPanel's `$identify` endpoint to merge the included distinct_ids. This merges the client generated id, used for anonymous, non-authenticated metrics with the Bard auto-generated `distinct_id` to link an anonymous session with a user. Requires an authorization token that is verified with Sam
   * @apiName identify
   * @apiVersion 1.0.0
   * @apiGroup Events
   * @apiParam {String} anonId The distinct id of an anonymous user, this is required
   * @apiSuccess (200) {String} response An empty string
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
      log(decorateWithInternalProperties(req, data)),
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
   * @apiSuccess (200) {String} response An empty string
   */
  app.post('/api/syncProfile', promiseHandler(withAuth(async req => {
    const res = await fetchOk(
      `${orchestrationRoot}/register/profile`,
      { headers: { authorization: req.headers.authorization }, serviceName: 'profile' }
    )

    /*
     * The user id we get back from Orch is only sometimes the same as the
     * Sam user id (req.user.userSubjectId). Make sure to use the Sam user
     * id when identifying users to MixPanel, since this is the identifier
     * used by all other Bard functions. See SUP-686 for more detail.
     */
    const response = await res.json()
    const anonEmail = _.get('value', _.find({ key: 'anonymousGroup' }, response.keyValuePairs))
    const realEmail = _.get('value', _.find({ key: 'email' }, response.keyValuePairs))
    const data = {
      '$token': token,
      '$distinct_id': userDistinctId(req.user),
      '$set': {
        '$email': anonEmail,
        '$accountType': getAccountType(realEmail),
        '$emailDomain': getEmailDomain(realEmail)
      }
    }
    await Promise.all([
      log(decorateWithInternalProperties(req, data)),
      token && fetchMixpanel('engage', { data })
    ])

    return new Response(200)
  })))
}

main().catch(console.error)

module.exports = app
