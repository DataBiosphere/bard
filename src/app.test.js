const request = require('supertest')
const { v4 } = require('uuid')
const { when } = require('jest-when')
const app = require('./app')
const { logger } = require('./google-utils')
const { fetchOk } = require('./utils')

// Constants
const distinctId = v4()
const terraUserId = '1234'
const mixpanelToken = 'superdupersecret'
const userAnonymousGroup = 'foo@support.firecloud.org'
const userEmail = 'myemail@foo.com'

/*
 * Call counters.  Spying doesn't seem to be reliable when direftly interacting with functions so we manage our
 * own call counters.  We increment them on mock implementations
 */
const numTimesVerifyAuthCalled = [0]
const numTimesFetchMixpanelCalled = [0]
const numTimesSyncProfileCalled = [0]

// Mocks and spies
jest.mock('./config', () => ({
  'project': 'test-project',
  'orchestrationRoot': 'test-orchestration',
  'samRoot': 'test-sam'
}))

jest.mock('./google-utils', () => {
  const originalModule = jest.requireActual('./google-utils')
  // Jest is strict about nesting mocked unless you name the function something that starts with 'mock'
  const mockLog = jest.fn(() => {})
  return {
    ...originalModule,
    logger: jest.fn(() => mockLog),
    getSecret: jest.fn(() => mixpanelToken)
  }
})
const log = logger({ project: 'test', logName: 'test' })

jest.mock('./utils', () => {
  const originalModule = jest.requireActual('./utils')
  return {
    ...originalModule,
    fetchOk: jest.fn(() => { Promise.resolve({ status: 200 }) })
  }
})

// Tests
beforeEach(() => {
  jest.resetAllMocks()
  numTimesVerifyAuthCalled[0] = 0
  numTimesFetchMixpanelCalled[0] = 0
  numTimesSyncProfileCalled[0] = 0
})

describe('Test the root path', () => {
  test('calling status returns 200', async () => {
    const response = await request(app).get('/status')
    expect(response.statusCode).toBe(200)
  })

  test('should return strict-transport-security headers', async () => {
    const response = await request(app).get('/status')
    expect(response.headers).toEqual(expect.objectContaining({ 'strict-transport-security': expect.anything() }))
  })
})

describe('Test static docs', () => {
  test('calling / redirects and returns the swagger page', async () => {
    const response = await request(app).get('/')
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/swagger')
  })

  test('calling docs shows apidocs page', async () => {
    const response = await request(app).get('/docs/')
    expect(response.statusCode).toBe(200)
  })

  test('calling bogus url fails with not found error', async () => {
    const response = await request(app).get('/docs-bad/')
    expect(response.statusCode).toBe(404)
  })
})

describe('Test sending events', () => {
  test('calling event with post happy path (unauthed)', async () => {
    mockSuccessfulMixpanelEventTrackCall()
    const response = await request(app).post('/api/event')
      .send({ event: 'foo', properties: { appId: 'test', 'distinct_id': distinctId } })
    expect(response.statusCode).toBe(200)
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0].properties.terra_user_id).toBeUndefined()
    expect(numTimesVerifyAuthCalled[0]).toBe(0)
    expect(numTimesFetchMixpanelCalled[0]).toBe(1)
  })

  test('calling event with post happy path (unauthed) - no mixpanel', async () => {
    const response = await request(app).post('/api/event')
      .send({ event: 'foo', properties: { appId: 'test', 'distinct_id': distinctId, pushToMixpanel: false } })
    expect(response.statusCode).toBe(200)
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0].properties.terra_user_id).toBeUndefined()
    expect(numTimesVerifyAuthCalled[0]).toBe(0)
    // This line is the main difference from the previous test
    expect(numTimesFetchMixpanelCalled[0]).toBe(0)
  })

  test('calling event with post happy path (authed)', async () => {
    mockSuccessfulMixpanelEventTrackCall()
    mockEnabledUserSamAuthCall()
    const response = await request(app).post('/api/event')
      .send({ event: 'foo', properties: { appId: 'test' } })
      .set('Authorization', 'Bearer mysupersecrettoken')
    expect(response.statusCode).toBe(200)
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0].properties.terra_user_id).toBe(terraUserId)
    expect(numTimesVerifyAuthCalled[0]).toBe(1)
  })

  // Negative cases
  test('calling event with get fails', async () => {
    const response = await request(app).get('/api/event')
    expect(response.statusCode).toBe(404)
  })

  test('calling event with post fails with no properties', async () => {
    const response = await request(app).post('/api/event').send({ event: 'foo' })
    expect(response.statusCode).toBe(400)
  })

  test('calling event with post fails with no event', async () => {
    const response = await request(app).post('/api/event').send({ properties: {} })
    expect(response.statusCode).toBe(400)
  })

  test('calling event with post fails with insufficient properties', async () => {
    const response = await request(app).post('/api/event').send({ event: 'foo', properties: { appId: 'test' } })
    expect(response.statusCode).toBe(400)
  })

  test('calling event with post fails with invalid distinct_i', async () => {
    const response = await request(app).post('/api/event').send({ event: 'foo', properties: { 'distinct_id': 'notuuid' } })
    expect(response.statusCode).toBe(400)
  })

  test('calling event with post fails with distinct_id and user', async () => {
    mockEnabledUserSamAuthCall()
    const response = await request(app).post('/api/event')
      .send({ event: 'foo', properties: { appId: 'test', 'distinct_id': distinctId } })
      .set('Authorization', 'Bearer mysupersecrettoken')
    expect(response.statusCode).toBe(400)
  })

  test('calling event with post fails with unauthed user', async () => {
    mockDisabledUserSamAuthCall()
    const response = await request(app).post('/api/event')
      .send({ event: 'foo', properties: { appId: 'test', 'distinct_id': distinctId } })
      .set('Authorization', 'Bearer mysupersecrettoken')
    expect(response.statusCode).toBe(403)
    expect(log).toHaveBeenCalledTimes(0)
    expect(numTimesVerifyAuthCalled[0]).toBe(1)
    expect(numTimesFetchMixpanelCalled[0]).toBe(0)
  })
})

describe('Test identifying users', () => {
  test('calling identify user happy path', async () => {
    mockEnabledUserSamAuthCall()
    const response = await request(app).post('/api/identify')
      .send({ anonId: distinctId })
    expect(response.statusCode).toBe(200)
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0]).toEqual({
      event: '$identify',
      properties: {
        '$identified_id': 'google:1234',
        '$anon_id': distinctId,
        'terra_user_id': terraUserId,
        token: mixpanelToken
      }
    })
  })

  test('calling identify user fails when user disabled', async () => {
    mockDisabledUserSamAuthCall()
    const response = await request(app).post('/api/identify')
      .send({ anonId: distinctId })
    expect(response.statusCode).toBe(403)
  })

  test('calling identify user fails with no anonId', async () => {
    mockEnabledUserSamAuthCall()
    const response = await request(app).post('/api/identify')
      .send({})
    expect(response.statusCode).toBe(400)
  })
})

describe('Test syncing profiles', () => {
  test('calling syncProfile happy path', async () => {
    mockEnabledUserSamAuthCall()
    mockOrchestrationCall()
    mockSuccessfulMixpanelEngageTrackCall()
    const response = await request(app).post('/api/syncProfile')
    expect(response.statusCode).toBe(200)
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0]).toEqual({
      '$token': mixpanelToken,
      '$distinct_id': 'google:1234',
      '$set': {
        '$email': userAnonymousGroup,
        '$accountType': 'Enterprise User',
        '$emailDomain': 'foo.com'
      },
      'properties': {
        'terra_user_id': terraUserId
      }
    })
    expect(numTimesVerifyAuthCalled[0]).toBe(1)
    expect(numTimesFetchMixpanelCalled[0]).toBe(1)
    expect(numTimesSyncProfileCalled[0]).toBe(1)
  })

  test('calling identify user fails when user disabled', async () => {
    mockDisabledUserSamAuthCall(terraUserId)
    mockOrchestrationCall()
    mockSuccessfulMixpanelEngageTrackCall()
    const response = await request(app).post('/api/syncProfile')
    expect(response.statusCode).toBe(403)
  })
})

// Helpers
const mockSuccessfulMixpanelEventTrackCall = () =>
  when(fetchOk).calledWith(expect.stringContaining('https://api.mixpanel.com/track'), expect.anything())
    .mockImplementation(() => {
      numTimesFetchMixpanelCalled[0]++
      return { text: () => ('1') }
    })

const mockSuccessfulMixpanelEngageTrackCall = () =>
  when(fetchOk).calledWith(expect.stringContaining('https://api.mixpanel.com/engage'), expect.anything())
    .mockImplementation(() => {
      numTimesFetchMixpanelCalled[0]++
      return { text: () => ('1') }
    })

const mockEnabledUserSamAuthCall = () =>
  when(fetchOk)
    .calledWith('test-sam/register/user/v2/self/info', expect.anything())
    .mockImplementation(() => {
      numTimesVerifyAuthCalled[0]++
      return { json: () => ({ enabled: true, userSubjectId: terraUserId }) }
    })

const mockDisabledUserSamAuthCall = () =>
  when(fetchOk)
    .calledWith('test-sam/register/user/v2/self/info', expect.anything())
    .mockImplementation(() => {
      numTimesVerifyAuthCalled[0]++
      return { json: () => ({ enabled: false, userSubjectId: terraUserId }) }
    })

const mockOrchestrationCall = () =>
  when(fetchOk)
    .calledWith('test-orchestration/register/profile', expect.anything())
    .mockImplementation(() => {
      numTimesSyncProfileCalled[0]++
      return {
        json: () => ({
          keyValuePairs: [
            { key: 'anonymousGroup', value: userAnonymousGroup },
            { key: 'email', value: userEmail }
          ]
        })
      }
    })
