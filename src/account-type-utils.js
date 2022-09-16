const validator = require('validator')
const _ = require('lodash')

/**
 * Maps the email domain to an account type.
 * The key is the account type, the value is a list of domains that map to that account type.
 *
 * @param {string} email The email address to map.
 * @returns {string} Returns the account type related to the domain.
 * @example
 *
 * getAccountType('gdematto@broadinstitute.org')
 * // => 'Broad Employee'
 *
 * getAccountType('email@gmail.com')
 * // => 'Independent User'
 *
 * getAccountType('email@mit.edu')
 * // => 'Educational Institution User'
 *
 */

const accountTypeMapping = require('../config/account-types.json')

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
