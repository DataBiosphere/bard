const { samRoot } = require('./config')
const { fetchOk, Response } = require('./utils')
const { jwtDecode, InvalidTokenError }   = require('jwt-decode')
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
  try {
    const decodedToken = jwtDecode(req.headers.authorization.replace('Bearer ', ''))

    const userEmail = decodedToken.email
    // If no email is in the jwt skip checking the cache.
    const maybeCachedUser = userEmail === undefined ? undefined : samUserCache.get(userEmail)

    if (maybeCachedUser === undefined) {
      await getSamUser(req, userEmail)
    } else {
      req.user = maybeCachedUser
    }
  } catch (e) {
    // If the token is invalid we assume the request would have been rejected by sam's proxy anyways
    if (e instanceof InvalidTokenError) {
      console.warn(`Invalid token from <${req.headers.host}> "${e.message}"`)
      throw new Response(401, 'Invalid auth token')
    } else {
      throw e
    }
  }
}

module.exports = {
  verifyAuth
}
