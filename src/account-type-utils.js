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
  'com', 'net', 'io', 'ai', 'co', 'app', 'us', 'uk', 'ca',
  'de', 'fr', 'jp', 'au', 'ru', 'ch', 'se', 'no', 'nl', 'it',
  'es', 'dk', 'cz', 'br', 'be', 'at', 'ar', 'in', 'mx', 'pl',
  'pt', 'fi', 'gr', 'hk', 'id', 'ie', 'il', 'is', 'kr', 'my',
  'nz', 'ph', 'sg', 'th', 'tw', 'vn', 'cn'
]

const domainTlds = {
  'broadinstitute.org': userTypes.BroadEmployee,
  'firecloud.org': userTypes.BroadEmployee,
  'verily.com': userTypes.VerilyEmployee,
  'google.com': userTypes.VerilyEmployee,
  'gmail.com': userTypes.IndependentUser,
  'gserviceaccount.com': userTypes.ServiceAccountUser,
  'edu': userTypes.EducationalInstituteUser,
  'org': userTypes.NonProfitUser,
  'gov': userTypes.GovUser 
}

const validateEmail = email => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    )
}

const getAccountType = email => {
  if (!validateEmail(email)) {
    return userTypes.Other 
  }

  const emailDomain = email.split('@').pop()

  for (const [domain, accountType] of Object.entries(domainTlds)) {
    if (emailDomain.endsWith(domain) || generalTld.some(tld => emailDomain.endsWith(`.${domain}.${tld}`))) {
      return accountType
    }
  }

  if (generalTld.some(tld => emailDomain.endsWith(`.${tld}`))) {
    return userTypes.EnterpriseUser 
  }

  return userTypes.Other 
}

module.exports = { getAccountType }
