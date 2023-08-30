const { fetchOk } = require('./utils')
const btoa = require('btoa-lite')

// Call the mixpanel api
const fetchMixpanel = async (url, { data, ...options } = {}) => {
  const res = await fetchOk(
    `https://api.mixpanel.com/${url}?data=${btoa(JSON.stringify(data))}`,
    { serviceName: 'metrics', ...options }
  )
  const status = await res.text()
  if (status !== '1') {
    console.error(`Failed to log to mixpanel:`, data)
    throw new Response(400, 'Error saving metrics data')
  }
}

module.exports = {
  fetchMixpanel
};