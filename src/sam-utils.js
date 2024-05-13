const { samRoot } = require('./config')
const { fetchOk, Response } = require('./utils')
const { jwtDecode }   = require('jwt-decode')
const NodeCache = require('node-cache')

const samUserCache = new NodeCache({ stdTTL: 300, checkperiod: 300, maxKeys: 10000 })

async function getSamUser(req, userEmail) {
  const res = await fetchOk(
    `${samRoot}/register/user/v2/self/info`,
    { headers: { authorization: req.headers.authorization }, serviceName: 'auth' }
  )
  const samUser = await res.json()
  samUserCache.set(userEmail, samUser)
  req.user = samUser
  if (!req.user.enabled) {
    throw new Response(403, 'Forbidden')
  }
}

// Verify the user's auth token with Sam
const verifyAuth = async req => {
  const decodedToken = jwtDecode(req.headers.authorization.replace('Bearer ', ''))
  const userEmail = decodedToken.email
  const maybeCachedUser = samUserCache.get(userEmail)

  if (maybeCachedUser === undefined) {
    await getSamUser(req, userEmail)
  } else {
    req.user = maybeCachedUser
  }
}

module.exports = {
  verifyAuth
}
