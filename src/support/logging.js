// Customize a logger from the winston module.
// Set logging level with LOG_LEVEL env variable or default to INFO.
'use strict'

var winston = require('winston')
var moment = require('moment')

var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      humanReadableUnhandledException: true,
      timestamp: function() {
        return moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ')
      },
      formatter: function(options) {
        // Return string will be passed to logger.
        return (
          options.timestamp() +
          ' ' +
          options.level.toUpperCase() +
          ' ' +
          (options.message ? options.message : '') +
          (options.meta && Object.keys(options.meta).length
            ? ' ' + JSON.stringify(options.meta)
            : '')
        )
      }
    })
  ]
})

logger.exitOnError = false
logger.level = process.env.LOG_LEVEL || 'info'

module.exports = logger
