const _ = require('lodash')
const accountTypeMapping = require('../config/account-types.json')

/**
 * Maps the email domain to an account type.
 * To add or remove types, please refer to the ../config/account-types.json file.
 * The key is the account type, and the value is the mapped domains.
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

const getAccountType = email => {
  if (!_.includes(email, '@') ||
      !_.includes(email, '.')) {
    return 'Unknown'
  }

  const [domain, topLevelDomain] = _
    .chain(email)
    .split('@')
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
