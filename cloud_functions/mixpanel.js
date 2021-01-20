const _ = require('lodash/fp')
const { project } = require('./config')
const Mixpanel = require('mixpanel')
const utils = require('./utils')


const getMixpanel = _.once(async () => {
  console.log('Cold start; initializing mixpanel')
  const token = await utils.getSecret({ project, secretName: 'mixpanel-api' })
  return Mixpanel.init(token)
})


module.exports = {
  getMixpanel
}
