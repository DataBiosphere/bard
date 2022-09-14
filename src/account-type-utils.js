const validator = require('validator')
const _ = require('lodash')

/*
 * Returns the account type based on the user's email address
 * to use as a Mixpanel property on the user profile.
 *
 */

const userTypes = {
  BroadEmployee: 'Broad Employee',
  VerilyEmployee: 'Verily Employee',
  IndependentUser: 'Independent User',
  EnterpriseUser: 'Enterprise User',
  ServiceAccountUser: 'Service Account User',
  EducationalInstituteUser: 'Educational Institute User',
  NonProfitUser: 'Non-profit User',
  GovUser: 'Government User',
  Other: 'Other'
}

const generalTld = [
  'co', 'app', 'us', 'uk', 'ca',
  'de', 'fr', 'jp', 'au', 'ru', 'ch', 'se', 'no', 'nl', 'it',
  'es', 'dk', 'cz', 'br', 'be', 'at', 'ar', 'in', 'mx', 'pl',
  'pt', 'fi', 'gr', 'hk', 'id', 'ie', 'il', 'is', 'kr', 'my',
  'nz', 'ph', 'sg', 'th', 'tw', 'vn', 'cn'
]

const domainTlds = {
  '.broadinstitute.org': userTypes.BroadEmployee,
  '.firecloud.org': userTypes.BroadEmployee,
  '.verily.com': userTypes.VerilyEmployee,
  '.google.com': userTypes.VerilyEmployee,
  '.gmail.com': userTypes.IndependentUser,
  '.gserviceaccount.com': userTypes.ServiceAccountUser,
  '.com': userTypes.EnterpriseUser,
  '.net': userTypes.EnterpriseUser,
  '.co': userTypes.EnterpriseUser,
  '.io': userTypes.EnterpriseUser,
  '.ca': userTypes.EnterpriseUser,
  '.ai': userTypes.EnterpriseUser,
  '.edu': userTypes.EducationalInstituteUser,
  '.org': userTypes.NonProfitUser,
  '.gov': userTypes.GovUser
}

const getAccountType = email => {
  if (!validator.isEmail(email)) {
    return userTypes.Other
  }

  const domain = '.' + email.split('@').pop()
  const lastTwoDomainParts = '.' + _.join(_.takeRight(domain.split('.'), 2), '.')

  const accountType = _.map(domainTlds, (value, key) => {
    if (domain.endsWith(key) || _.some(generalTld, tld => lastTwoDomainParts.endsWith(`${key}.${tld}`))) {
      return value
    }
  })

  return _.find(accountType) || userTypes.Other
}

module.exports = { getAccountType }
