const { promisify } = require('util')
const utils = require('./utils')


const run = utils.withErrorReporting((mixpanel, message) => {
  const userSubjectId = validate(message)
  return new Promise((resolve, reject) => {
    mixpanel.people.set(`google:${userSubjectId}`, { 'isCryptominer': true },
        error => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
  })
})

const validate = message => {
  if (!(message.attributes && (message.attributes.cryptominer === true || message.attributes.cryptominer === 'true'))) {
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
