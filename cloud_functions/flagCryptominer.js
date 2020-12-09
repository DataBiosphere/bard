const utils = require('./utils')


const run = (mixpanel, message) => {
  const userSubjectId = validate(message)
  if (userSubjectId) {
    mixpanel.people.set(`google:${userSubjectId}`, { 'isCryptominer': true }, utils.logMixpanelError)
  }
}

const validate = message => {
  if (!(message.attributes && message.attributes.cryptominer === true)) {
    console.error(new Error('Unexpected message; missing `cryptominer: true` attribute. Is the Pub/Sub subscription set up correctly?'))
    return
  }
  let data
  try {
    data = message.data && JSON.parse(Buffer.from(message.data, 'base64').toString())
  } catch (error) {
    console.error(utils.coerceToError(error))
    return
  }
  if (!(data && data.userSubjectId)) {
    console.error(new Error('Invalid message: missing userSubjectId'))
    return
  }
  return data.userSubjectId
}


module.exports = {
  run
}
