const { samRoot } = require('./config')
const { fetchOk, Response } = require('./utils')
const NodeCache = require('node-cache')

const samUserCache = new NodeCache({ stdTTL: 300, checkperiod: 300, maxKeys: 10000 })

async function getSamUser(req) {
  const res = await fetchOk(
    `${samRoot}/register/user/v2/self/info`,
    { headers: { authorization: req.headers.authorization }, serviceName: 'auth' }
  )
  const samUser = await res.json()
  samUserCache.set(req.headers.authorization, samUser)
  return samUser
}

// Verify the user's auth token with Sam
const verifyAuth = async req => {
  // If no email is in the jwt skip checking the cache.
  const maybeCachedUser = samUserCache.get(req.headers.authorization)

  if (maybeCachedUser === undefined) {
    req.user = await getSamUser(req)
  } else {
    req.user = maybeCachedUser
  }
  if (!req.user.enabled) {
    throw new Response(403, 'Forbidden')
  }
}

module.exports = {
  verifyAuth,
  samUserCache
}
