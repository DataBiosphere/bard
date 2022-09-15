const validator = require('validator')
const _ = require('lodash')

/*
 * Returns the account type based on the user's email address
 * to use as a Mixpanel property on the user profile.
 *
 */

const generalTld = [
  'de', 'fr', 'jp', 'au', 'ru', 'ch', 'se', 'no', 'nl', 'it',
  'es', 'dk', 'cz', 'br', 'be', 'at', 'ar', 'in', 'mx', 'pl',
  'pt', 'fi', 'gr', 'hk', 'id', 'ie', 'il', 'is', 'kr', 'my',
  'nz', 'ph', 'sg', 'th', 'tw', 'vn', 'cn'
]

const accountTypeMapping = {
  'Broad Employee': ['.broadinstitute.org', '.firecloud.org'],
  'Verily Employee': ['.verily.com', '.verilylifesciences.com', '.google.com'],
  'Service Account User': ['.gserviceaccount.com'],
  'Independent User': ['.gmail.com'],
  'Educational Institute User': ['.edu'],
  'Non-profit User': ['.org'],
  'Government User': ['.gov'],
  'Enterprise User': ['.com', '.net', '.io', '.co', '.app', '.us', 'uk', 'ca']
}


const getAccountType = email => {
  if (!validator.isEmail(email)) {
    return 'Unknown'
  }

  const domain = '.' + email.split('@').pop()
  const lastTwoDomainParts = '.' + _.join(_.takeRight(domain.split('.'), 2), '.')

  const accountType = _.map(accountTypeMapping, (domainList, userType) => {
    if (_.some(domainList, domainItem => _.endsWith(domain, domainItem))) {
      return userType
    }

    const matchingTld = _.some(domainList, domainObj => {
      return _.some(generalTld, tld => {
        return lastTwoDomainParts === `${domainObj}.${tld}` ||
               lastTwoDomainParts === `${domainObj}.${tld}.`
      })
    })

    return _.size(domainList) === 1 && matchingTld && userType
  })

  return _.find(accountType) || 'Unknown'
}

module.exports = { getAccountType }
