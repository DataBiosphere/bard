const utils = require('./utils')


const run = (mixpanel, message) => {
  try {
    const userSubjectId = validate(message)
    mixpanel.people.set(`google:${userSubjectId}`, { 'isCryptominer': true }, err => { if (err) throw err })
  } catch (error) {
    console.error(utils.coerceToError(error))
  }
}

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
