// These tests cover various error cases for the flagCryptominer cloud function.
// Based on https://cloud.google.com/functions/docs/testing/test-background#unit_tests
//
// Since this is a background cloud function, errors are exposed via Cloud Logging Error Reporting.
// Uncaught exceptions will log errors, but will also incur a cold start on future invocations.
// Instead, we use console.error, so we need to stub that function for these tests.
// See https://cloud.google.com/functions/docs/monitoring/error-reporting for details.
//
// IMPORTANT: Since we're stubbing a global function (console.error), all of these tests must run
// in serial, not parallel as is Ava's default.
// (For future exploration: https://github.com/sinonjs/sinon-test)
const test = require('ava')
const flagCryptominer = require('../flagCryptominer')
const sinon = require('sinon')
const utils = require('./test-utils')


test.beforeEach(t => {
  sinon.stub(console, 'error')
})

test.afterEach.always(t => {
  console.error.restore()
})


// The function should do nothing if the cryptominer attribute isn't set. This could indicate a
// misconfigured Pub/Sub topic subscription.
test.serial('reject non-cryptominer messages', async t => {
  const mixpanel = utils.makeStubMixpanel()
  const message = {
    data: utils.encodeMessageData({ userSubjectId: '123' })
  }

  await flagCryptominer.run(mixpanel, message)

  checkConsoleError(t, /unexpected message/i)
  t.assert(mixpanel.people.set.notCalled)
})

test.serial('data is not JSON', async t => {
  const mixpanel = utils.makeStubMixpanel()
  const message = {
    attributes: { cryptominer: true },
    data: Buffer.from('invalid').toString('base64')
  }

  await flagCryptominer.run(mixpanel, message)

  checkConsoleError(t, /JSON/) // error message mentioning JSON is a good clue that the JSON was invalid
  t.assert(mixpanel.people.set.notCalled)
})

test.serial('catch missing userSubjectId', async t => {
  const mixpanel = utils.makeStubMixpanel()
  const message = {
    attributes: { cryptominer: true },
    data: utils.encodeMessageData({})
  }

  await flagCryptominer.run(mixpanel, message)

  checkConsoleError(t, /missing userSubjectId/i)
  t.assert(mixpanel.people.set.notCalled)
})

test.serial('catch error from Mixpanel', async t => {
  const mixpanel = utils.makeStubMixpanel()
  mixpanel.people.set.callsFake((id, properties, callback) => {
    callback(new Error('Boom'))
  })
  const message = {
    attributes: { cryptominer: true },
    data: utils.encodeMessageData({ userSubjectId: '123' })
  }

  await flagCryptominer.run(mixpanel, message)

  t.assert(mixpanel.people.set.calledOnceWith('google:123', { isCryptominer: true }))
  t.assert(console.error.calledOnceWith(sinon.match.instanceOf(Error)))
  t.assert(console.error.calledOnceWith(sinon.match({ message: 'Boom' })),
      `Actual message: ${console.error.firstCall.args[0].toString()}`)
})

const checkConsoleError = (t, regex) => {
  t.assert(console.error.calledWith(sinon.match.instanceOf(Error).and(e => e.message.match(regex))),
      `Expected call with Error matching ${regex}. Got calls:\n${console.error.printf('%C')}`)
}
