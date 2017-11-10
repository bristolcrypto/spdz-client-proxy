/**
 * Web socket server to receive client connections and manage interactions with a runnng SPDZ process.
 * Note socket id is used to track the client connection. No additional state here, see spdzEngine.
 */
'use strict'

const logger = require('../support/logging')

/**
 * Notified that new SPDZ message for this client is avaliable so consume and send to web socket.
 * 
 * @description Data sent by SPDZ is pushed to the client as soon as it is received by the SPDZ Proxy.
 *  Push of data is set up in the connectToSpdz instruction. See SPDZ instructions sint, cint, regint, sfix, 
 *  cfix write_to_socket
 * @name consumeData
 * @return {String} event name spdz_message
 * @return {String} data containing binary SPDZ data in little endian format. 
 * The SPDZ MPC instruction write_to_socket may write a 4 byte data type header. 
 * Data is optionally encrypted depending on connectToSpdz parameters.
 * 
 * @example Client code to accept pushed SPDZ messages:
 * 
 * socket.on('spdz_message', response => {
 *   parseSpdzMessage(value)
 * })
 * @access public
 */
const handleNewSpdzMessage = (spdzEngine, clientSocket) => {
  if (clientSocket.connected) {
    try {
      const spdzData = spdzEngine.getServerTransmission(clientSocket.id)

      if (spdzData !== null) {
        clientSocket.emit('spdz_message', spdzData)
      } else {
        logger.warn(
          `Should not be getting notification of new spdz message for client ${clientSocket.id} and then not find one.`
        )
      }
    } catch (err) {
      logger.warn(
        `Notified of new spdz message, got error trying to consume it - ${err.message}.`
      )
    }
  } else {
    logger.debug(
      'Getting notification of new SPDZ message but client web socket is disconnected.'
    )
  }
}

/**
 * Notified that SPDZ has closed the socket connection to the proxy. Notify back to the client web socket.
 * @param {Socket} clientSocket to send message too.
 */
const handleSpdzSocketClosed = clientSocket => {
  if (clientSocket.connected) {
    clientSocket.emit('spdz_socketDisconnected', {
      status: 0
    })
  } else {
    logger.debug(
      'Getting notification of SPDZ socket closed but client web socket is disconnected.'
    )
  }
}

/**
 * Setup SPDZ socket connection tracking connection with clientSocket id.
 * @param {Socket} spdzEngine instance of spdzEngine.
 * @param {socket.io socket} clientSocket 
 * @param {string} clientPublicKey optional client public key.
 * @return Promise resolving with () or rejecting with error.
 */
const setupSpdzConnection = (spdzEngine, clientSocket, clientPublicKey) => {
  return new Promise(function(resolve, reject) {
    if (spdzEngine.checkConnection(clientSocket.id)) {
      reject(
        new Error(
          `Unable to setup SPDZ connection, this id ${clientSocket.id} is already connected.`
        )
      )
    } else {
      spdzEngine
        .setupConnection(
          clientSocket.id,
          clientPublicKey,
          () => {
            handleNewSpdzMessage(spdzEngine, clientSocket)
          },
          () => {
            handleSpdzSocketClosed(clientSocket)
          }
        )
        .then(() => {
          resolve()
        })
        .catch(err => {
          reject(err)
        })
    }
  })
}

/**
 * Setup web socket server to receive client socket connections.
 */
const setupSpdzInteraction = (io, namespace, spdzEngine) => {
  const ns = io.of(namespace)

  ns.on('connection', socket => {
    logger.debug(`Socket ${socket.id} connected.`)

    /**
     * @description Check to see if this web socket has a client connection to a SPDZ TCP socket.
     * @alias isSpdzConnected
     * @return {String} event name isSpdzConnected_result
     * @return {String} JSON response with {status : 0 (connected) | 1 (not connected) } 
     * @example Client code to check connection:
     * 
     * socket.emit('isSpdzConnected')
     * socket.on('isSpdzConnected_result', response => {
     *   console.log(response.status)
     * })
     * @access public
     */
    socket.on('isSpdzConnected', () => {
      const connected = spdzEngine.checkConnection(socket.id)
      socket.emit('isSpdzConnected_result', { status: connected ? 0 : 1 })
    })

    /**
     * @description Establish a stateful TCP connection to the running SPDZ process.
     *  See SPDZ instructions listen, acceptclientconnection.
     * @alias connectToSpdz
     * @param {String} [clientPublicKey] Optional client public key as 64 char hex string.
     *  If supplied all data will be encrypted with RSA authenticated encryption. Client must have access to SPDZ engine 
     *  public key. See SPDZ instruction regint.read_client_public_key.
     * @return {String} event name connectToSpdz_result
     * @return {String} JSON response with {status : 0 (succes) | 1 (error), err : error message } 
     * @example Client code to connect to SPDZ:
     * 
     * socket.emit('connectToSpdz', 'e0c5f66f1306ef1aeeb744ef38abaa28bb6c836c2ab0124d93dd9586cae8dd17')
     * socket.on('connectToSpdz_result', response => {
     *   console.log(response.status)
     * })
     * @access public
     */
    socket.on('connectToSpdz', clientPublicKey => {
      const reformatClientPublicKey =
        clientPublicKey !== undefined && clientPublicKey.length === 0
          ? undefined
          : clientPublicKey
      setupSpdzConnection(spdzEngine, socket, reformatClientPublicKey)
        .then(() => socket.emit('connectToSpdz_result', { status: 0 }))
        .catch(err => {
          socket.emit('connectToSpdz_result', { status: 1, err: err.message })
        })
    })

    /**
     * @description Send an array of inputs to the SPDZ engine over the previously established TCP socket.
     *  See SPDZ instructions sint, cint, regint read_from_socket.
     * @alias sendData
     * @param {String} dataType Either; modp - 128 bit Big Integer in Gfp field, Montgomery format, or int32 - 32 bit signed integer.
     * @param {Array} dataArray JSON structure containing array of base64 encoded 16 bytes (big endian) or integers.
     * @return {String} event name sendData_result
     * @return {String} JSON response with {status : 0 (succes) | 1 (error), err : error message } 
     * @example Client code to send modp big integers to SPDZ, for example shares of inputs:
     * 
     * socket.emit('sendData', 'modp', [
     *  'J72LqIgKBjKu5zFKt1vo4g==',
     *  'J72LqIgKBjKu5zFKt1vo4g=='
     * ])
     * @example Client code to send 32 bit integers to SPDZ:
     * 
     * socket.emit('sendData', 'int32', [1234, 7654])
     * 
     * @example Client code to accept the result:
     * 
     * socket.on('sendData_result', response => {
     *   console.log(response.status)
     * })
     * @access public
     */
    socket.on('sendData', (dataType, dataArray) => {
      if (dataType === 'modp' && dataArray instanceof Array) {
        if (spdzEngine.sendBigIntegers(socket.id, dataArray)) {
          socket.emit('sendData_result', { status: 0 })
        } else {
          socket.emit('sendData_result', {
            status: 1,
            err: 'Unable to send data (modp) to SPDZ engine.'
          })
        }
      } else if (dataType === 'int32' && dataArray instanceof Array) {
        if (spdzEngine.sendIntegers(socket.id, dataArray)) {
          socket.emit('sendData_result', { status: 0 })
        } else {
          socket.emit('sendData_result', {
            status: 1,
            err: 'Unable to send data (int32) to SPDZ engine.'
          })
        }
      } else {
        socket.emit('sendData_result', {
          status: 1,
          err: `Unable to process sendData request, unexpected data type ${dataType} or input type.`
        })
      }
    })

    /**
     * @description Disconnect the client represented by this web socket from the SPDZ TCP connection.
     * @alias disconnectFromSpdz
     * @return {String} event name disconnectFromSpdz_result
     * @return {String} JSON response with {status : 0 (success)} 
     * @example Client code to disconnect connection:
     * 
     * socket.emit('disconnectFromSpdz')
     * @access public
     */
    socket.on('disconnectFromSpdz', () => {
      spdzEngine.closeConnection(socket.id)
      socket.emit('disconnectFromSpdz_result', { status: 0 })
    })

    socket.on('disconnect', () => {
      logger.debug(`Socket ${socket.id} disconnected.`)
    })
  })
}

module.exports = setupSpdzInteraction
