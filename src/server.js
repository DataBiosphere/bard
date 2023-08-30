const app = require('./app')

server = app.listen(process.env.PORT || 8080)

module.exports = server
