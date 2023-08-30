const { samRoot } = require('./config')
const { fetchOk, Response } = require('./utils')

// Verify the user's auth token with Sam
const verifyAuth = async req => {
  const res = await fetchOk(
    `${samRoot}/register/user/v2/self/info`,
    { headers: { authorization: req.headers.authorization }, serviceName: 'auth' }
  )
  req.user = await res.json()
  if (!req.user.enabled) {
    throw new Response(403, 'Forbidden')
  }
}

module.exports = {
  verifyAuth
}
