const { promisify } = require('util')
const utils = require('./utils')


const run = utils.withErrorReporting((mixpanel, message) => {
  const userSubjectId = validate(message)
  return promisify(mixpanel.people.set)(`google:${userSubjectId}`, { 'isCryptominer': true })
})

const validate = message => {
  if (!(message.attributes && message.attributes.cryptominer === true)) {
    throw new Error('Unexpected message; missing `cryptominer: true` attribute. Is the Pub/Sub subscription set up correctly?')
  }
  const data = message.data && JSON.parse(Buffer.from(message.data, 'base64').toString())
  if (!(data && data.userSubjectId)) {
    throw new Error('Invalid message: missing userSubjectId')
  }
  return data.userSubjectId
}


module.exports = {
  run
}
