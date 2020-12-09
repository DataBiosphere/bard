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
const test = require('ava')
const { flagCryptominer } = require('../function')
const sinon = require('sinon')


test.beforeEach(t => {
  sinon.stub(console, 'error')
})

test.afterEach.always(t => {
  console.error.restore()
})


// The function should do nothing if the cryptominer attribute isn't set. This could indicate a
// misconfigured Pub/Sub topic subscription.
test.serial('reject non-cryptominer messages', async t => {
  const message = {
    data: encodeData({ userSubjectId: '123' })
  }
  await flagCryptominer(message, {})
  checkConsoleError(t, /unexpected message/i)
})

test.serial('data is not JSON', async t => {
  const message = {
    attributes: { cryptominer: true },
    data: Buffer.from('invalid').toString('base64')
  }
  await flagCryptominer(message, {})
  checkConsoleError(t, /JSON/) // error message mentioning JSON is a good clue that the JSON was invalid
})

test.serial('catch missing userSubjectId', async t => {
  const message = {
    attributes: { cryptominer: true },
    data: encodeData({})
  }
  await flagCryptominer(message, {})
  checkConsoleError(t, /missing userSubjectId/i)
})


// Utilities

const encodeData = obj => Buffer.from(JSON.stringify(obj)).toString('base64')

const checkConsoleError = (t, regex) => {
  t.assert(console.error.calledWith(sinon.match(e => e instanceof Error && e.message.match(regex))),
      `Expected call with Error matching ${regex}. Got calls:\n${console.error.printf('%C')}`)
}
