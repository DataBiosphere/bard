const sinon = require('sinon')


const encodeMessageData = obj => Buffer.from(JSON.stringify(obj)).toString('base64')

const makeStubMixpanel = () => {
  return {
    people: {
      set: sinon.stub()
    }
  }
}

module.exports = {
  encodeMessageData,
  makeStubMixpanel
}
