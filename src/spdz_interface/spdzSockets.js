// Hold list of established socket connections to a spdz engine for clients.
// Manages setup, teardown and sending data, but doesn't handle receiving data from SPDZ.
// This is a stateful singleton module.
'use strict'

const net = require('net')
const logger = require('../support/logging')

/**
 * Hold map of client public keys to spdz server sockets.
 */
let spdzConnections = {}

// Public
module.exports = {
  // Return a promise to manage connection worked or failed.
  setupConnection: (clientId, spdzHost, spdzPort) => {
    return new Promise(function(resolve, reject) {
      let client = new net.Socket()

      client.once('connect', () => {
        spdzConnections[clientId] = client
        client.setNoDelay() // Remove buffering on socket write
        resolve(client)
      })

      client.once('error', error => {
        reject(error)
      })

      client.on('error', error => {
        // For future communication errors
        logger.warn(`Socket for client ${clientId} received error.`, error)
      })

      client.on('close', data => {
        logger.info(`Socket closed by SPDZ for client ${clientId}.`)
        delete spdzConnections[clientId]
      })

      client.connect({ port: spdzPort, host: spdzHost })
    })
  },

  sendData: (clientId, data) => {
    const client = spdzConnections[clientId]
    if (client) {
      const written = client.write(data)
      logger.debug(
        `Sending data to client ${clientId} data written immediately ${written}.`
      )
      return written
    } else {
      logger.debug(
        `Sending data to client ${clientId} no SPDZ connection exists.`
      )
      return false
    }
  },

  closeConnection: clientId => {
    const client = spdzConnections[clientId]
    if (client) {
      logger.debug(`User with client ${clientId} is ending connection.`)
      // Sending end sends Fin to server, but server not setup to respond and doesn't close socket
      // client.end()
      // Sending destroy closes socket, causes server end to code and notifies client.on('close')
      client.destroy()
      return true
    } else {
      return false
    }
  },

  checkConnection: clientId => {
    return spdzConnections.hasOwnProperty(clientId) || false
  }
}
