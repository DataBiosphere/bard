const test = require('ava')
const flagCryptominer = require('../flagCryptominer')
const sinon = require('sinon')
const utils = require('./test-utils')


test('sends userSubjectId to Mixpanel', t => {
  const mixpanel = utils.makeStubMixpanel()
  const message = {
    attributes: { cryptominer: true },
    data: utils.encodeMessageData({ userSubjectId: '123' })
  }

  flagCryptominer.run(mixpanel, message)

  t.assert(mixpanel.people.set.calledOnceWith('google:123', { isCryptominer: true }))
})

