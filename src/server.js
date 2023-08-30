const app = require('./app')

const server = app.listen(process.env.PORT || 8080)

module.exports = server
