const flagCryptominer = require('./flagCryptominer')
const { getMixpanel } = require('./mixpanel')


module.exports.flagCryptominer = async (message, context) => {
  const mixpanel = await getMixpanel()
  flagCryptominer.run(mixpanel, message)
}
