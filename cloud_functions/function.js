const flagCryptominer = require('./flagCryptominer')
const { getMixpanel } = require('./mixpanel')
const { promiseHandler, Response } = require('./utils')


module.exports.flagCryptominer = promiseHandler(async (req, res) => {
  const mixpanel = await getMixpanel()
  await flagCryptominer.run(mixpanel, req.body.message)
  return new Response(200)
})
