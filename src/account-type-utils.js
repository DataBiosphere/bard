const validator = require('validator')
const _ = require('lodash')

/*
 * Returns the account type based on the user's email address
 * to use as a Mixpanel property on the user profile.
 *
 */

const accountTypeMapping = {
  'Broad Employee': ['.broadinstitute.org', '.firecloud.org'],
  'Verily Employee': ['.verily.com', '.verilylifesciences.com', '.google.com'],
  'Service Account User': ['.gserviceaccount.com'],
  'Independent User': ['.gmail.com'],
  'Educational Institute User': ['.edu'],
  'Non-profit User': ['.org'],
  'Government User': ['.gov'],
  'Enterprise User': ['.com', '.net', '.io', '.co', '.app', '.us', '.uk', '.ca']
}


const getAccountType = email => {
  if (!validator.isEmail(email)) {
    return 'Unknown'
  }

  const [domain, topLevelDomain] = _.chain(email.split('@'))
    .takeRight(1)
    .split('.')
    .takeRight(2)
    .value()

  return _.findKey(accountTypeMapping, domainList =>
    _.some(domainList, domainItem =>
      _.startsWith(`.${domain}.${topLevelDomain}`, domainItem) ||
      _.startsWith(`.${topLevelDomain}`, domainItem))
  ) || 'Unknown'
}

module.exports = { getAccountType }
