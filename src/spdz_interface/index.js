/**
 * Main interface to talk to SPDZ engine, will be run by require('./spdz_interface')
 * Note implemented as a singleton, with shared state.
 *
 * TODO Once the spdzBufferedData for a client is drained and the socket connection is closed
 * should be deleted to avoid memory leak.
 */
'use strict'

const spdzSockets = require('./spdzSockets')
let spdzDataConversion = require('./spdzDataConversion')
let SpdzServerData = require('./spdzServerData')
let logger = require('../support/logging')

let spdzEngineHost = 'Not-yet-set'
let spdzEnginePort = 9443

/**
 * Hold map of client public keys to spdzServerData buffers.
 */
let spdzBufferedData = {}

let highestClientId = 0
const generateClientId = () => (highestClientId += 1)

const closeConnectionByClient = clientId => {
  const result = spdzSockets.closeConnection(clientId)
  // Delete buffered data whether empty or not.
  if (spdzBufferedData.hasOwnProperty(clientId)) {
    spdzBufferedData[clientId].removeAllListeners()
    delete spdzBufferedData[clientId]
  }
  return result
}

module.exports = {
  /**
   * Store the spdz engine connection details.
   */
  init: (spdzHost, spdzPort) => {
    spdzEngineHost = spdzHost
    spdzEnginePort = spdzPort
  },

  /**
   * Setup a connection from a client into a SPDZ engine.
   * If a spdz socket connection already exists force close it and clear any buffered data.
   * @param {String} clientId unique id provided by client, may be undefined in which case generated.
   * @param {String} clientPublicKey optional 64 byte string containing hex of RSA public key
   * @param {Function} spdzMessageCallBack optional callback function to be notified whan a 
   *        new SPDZ transmission message is available.
   * @param {Function} notifySpdzConnectionClosed optional callback function to be notified
   *        if the SPDZ socket connection gets closed.
   * @returns Promise with then(clientId), catch(err)
   */
  setupConnection: (
    clientId = undefined,
    clientPublicKey = undefined,
    spdzMessageCallBack = undefined,
    notifySpdzConnectionClosed = undefined
  ) => {
    clientId = clientId === undefined ? generateClientId() : clientId

    return new Promise(function(resolve, reject) {
      if (spdzSockets.checkConnection(clientId)) {
        logger.debug(
          `Connection for client id ${clientId} already existed, so reset.`
        )
        // This is perfectly possible, if client resubmits wihtout a refresh.
        // Should close existing connection first, then continue as if new.
        closeConnectionByClient(clientId)
      }

      spdzSockets
        .setupConnection(clientId, spdzEngineHost, spdzEnginePort)
        .then(socket => {
          // Setup buffer of incoming data
          spdzBufferedData[clientId] = new SpdzServerData(clientId)
          if (spdzMessageCallBack !== undefined) {
            spdzBufferedData[clientId].on('message_from_spdz', () => {
              spdzMessageCallBack()
            })
          }

          socket.on('data', chunk => {
            // If client close ran before data received, may no longer be place to store data
            if (spdzBufferedData.hasOwnProperty(clientId)) {
              logger.debug(
                `Received ${chunk.length} bytes from SPDZ engine for client ${clientId}.`
              )
              spdzBufferedData[clientId].storeChunk(chunk)
            } else {
              logger.warn(
                `Received ${chunk.length} bytes from SPDZ engine for client ${clientId} but no buffer to store in.`
              )
            }
          })

          socket.on('close', () => {
            if (notifySpdzConnectionClosed !== undefined) {
              notifySpdzConnectionClosed()
            }
          })

          /**
           * After socket established SPDZ program may require client public key. 
           */
          if (clientPublicKey !== undefined) {
            spdzSockets.sendData(
              clientId,
              spdzDataConversion.hexPublicKeyToBuffer(clientPublicKey)
            )
          }

          logger.info(
            `Socket connection to SPDZ for client ${clientId} established.`
          )
          resolve(clientId)
        })
        .catch(err => {
          logger.warn(
            `Socket connection to SPDZ for client ${clientId} failed.`,
            err
          )
          reject(err)
        })
    })
  },

  /**
   * Close connection initiated by browser client (not by SPDZ).
   */
  closeConnection: closeConnectionByClient,

  checkConnection: clientId => {
    return spdzSockets.checkConnection(clientId)
  },

  /**
   * Get a buffer byte array object previously supplied by SPDZ engine.
   * Maybe list of 128 bit big integers, maybe encrypted - don't know.
   * @param {String} clientId
   * @return {Buffer} Binary data in little endian format, or null
   */
  getServerTransmission: clientId => {
    const spdzData = spdzBufferedData[clientId]
    if (spdzData === undefined) {
      throw new Error(
        `Unable to get data for client ${clientId}, there is no SPDZ socket connection.`
      )
    }
    const buf = spdzData.popServerTransmission()
    buf === null
      ? logger.debug(
          `No buffer records are availabe to send to client ${clientId}.`
        )
      : logger.debug(
          `Sending ${buf.length} bytes from buffer to client ${clientId}.`
        )
    return buf
  },

  /**
   * Send an array of 128 bit big integers to the spdz engine.
   * No encryption, but expected to be shares which do not leak information about client input.
   * @param {String} clientId
   * @param {Array} Array<string> of base64 encoded big integers
   * @returns {true or false} Indicates a socket exists to send, not the data was sent successfully.
   */
  sendBigIntegers: (clientId, base64InputList) => {
    return spdzSockets.sendData(
      clientId,
      spdzDataConversion.base64ToSpdz(base64InputList)
    )
  },

  /**
   * Send an array of 32 bit integers to the spdz engine.
   * No encryption, expected to be used for clear integers.
   * @param {String} clientId
   * @param {Array} Array<Number> 32 bit integers
   * @returns {true or false} Indicates a socket exists to send, not the data was sent successfully.
   */
  sendIntegers: (clientId, integerList) => {
    return spdzSockets.sendData(
      clientId,
      spdzDataConversion.int32ToSpdz(integerList)
    )
  }
}
