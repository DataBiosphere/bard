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

/**
 * Retrieves the domain name from the given email address and returns it as a string.
 *
 * @param {string} email The email address to retrieve the domain from.
 * @returns {string} Returns the domain name or 'Unknown' if no domain name is found.
 * @example
 *
 * getEmailDomain('johndoe@example.com')
 * // => 'example.com'
 *
 * getEmailDomain('johndoe.example.com')
 * // => 'Unknown'
 *
 * getEmailDomain('johndoe@example')
 * // => 'Unknown'
 *
 */
const getEmailDomain = email => {
  if (!_.includes(email, '@') ||
    !_.includes(email, '.')) {
    return 'Unknown'
  }

  const [domain] = _
    .chain(email)
    .split('@')
    .takeRight(1)
    .value()

  return domain
}


module.exports = { getAccountType, getEmailDomain }
