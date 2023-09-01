const fetch = require('node-fetch')

class Response {
  constructor(status, data) {
    this.status = status
    this.data = data
  }
}

const promiseHandler = fn => (req, res) => {
  const handleValue = value => {
    if (value instanceof Response) {
      res.status(value.status).send(value.data)
    } else {
      console.error(value)
      res.status(500).send(value.toString())
    }
  }
  return fn(req, res).then(handleValue, handleValue)
}

const redirectHandler = redirectToPath => (_req, res) => {
  res.redirect(redirectToPath)
}

const validateInput = (value, schema) => {
  const { error } = schema.validate(value)
  if (error) {
    throw new Response(400, error.message)
  }
}

const delay = ms => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const fetchOk = async (url, { serviceName, ...options } = {}) => {
  const res = await fetch(url, options).catch(() => {
    throw new Response(503, `Unable to contact ${serviceName} service`)
  })
  if (res.status === 401) {
    throw new Response(401, 'Unauthorized')
  }
  if (!res.ok) {
    console.error(`${serviceName} error`, await res.text())
    throw new Response(503, `Failed to query ${serviceName} service`)
  }
  return res
}

module.exports = {
  Response,
  promiseHandler,
  redirectHandler,
  validateInput,
  delay,
  fetchOk
}
