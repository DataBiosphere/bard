const utils = require('./utils')
const { ValidationError }  = require('./ValidationError')


const run = (mixpanel, message) => {
  try {
    const userSubjectId = validate(message)
    if (userSubjectId) {
      mixpanel.people.set(`google:${userSubjectId}`, { 'isCryptominer': true }, err => { if (err) throw err })
    }
  } catch (error) {
    console.error(utils.coerceToError(error))
  }
}

const validate = message => {
  if (!(message.attributes && message.attributes.cryptominer === true)) {
    throw new ValidationError('Unexpected message; missing `cryptominer: true` attribute. Is the Pub/Sub subscription set up correctly?')
  }
  let data
  try {
    data = message.data && JSON.parse(Buffer.from(message.data, 'base64').toString())
  } catch (error) {
    throw new ValidationError(error.message)
  }
  if (!(data && data.userSubjectId)) {
    throw new ValidationError('Invalid message: missing userSubjectId')
  }
  return data.userSubjectId
}


module.exports = {
  run
}
