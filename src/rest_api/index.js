/**
 * Define REST API
 */
'use strict'

const express = require('express')
const router = express.Router()
const cors = require('cors')
const bodyParser = require('body-parser')
const HttpStatus = require('http-status-codes')
const logger = require('../support/logging')

const environ = process.env.NODE_ENV || 'development'

let spdzEngine = undefined

/**
 * REST API wide middleware goes here
 */
// Enable all cors requests (should include preflight options)
// Options needed to configure Access-Control-Expose-Headers to allow Location header to be read.
const corsOptions = {
  exposedHeaders: 'Location'
}
router.use(cors(corsOptions))
// Needed to parse application/json into req.body
router.use(bodyParser.json())
// Needed to parse application/octet-stream. into req.body
router.use(bodyParser.raw())

// Landing page
router.get('/', (req, res) => {
  res.type('text/plain')
  res.send('You have reached the SPDZ Rest interface. See ....')
})

/**
 * @description POST /spdzapi/connect-to-spdz. Establish a stateful TCP connection to the running SPDZ process using SPDZ instructions listen, acceptclientconnection.
 * @alias restConnectToSpdz
 * @param {String} [clientId]  Optional client id, if not supplied then generated and returned in Location header.
 * Needs to be used in future interactions from this client.
 * @param {String} [clientPublicKey] Optional client public key as 64 char hex string.
 * If supplied all data will be encrypted with RSA authenticated encryption.
 * Client must have access to SPDZ engine public key.
 * See SPDZ instruction regint.read_client_public_key.
 * @return {String} Location header for the connection resource containing generated client Id.
 * @example Sending the request:
 *   POST /spdzapi/connect-to-spdz
 *   Host: my-domain:8080
 *   Content-Type: 'application/json; charset=utf-8'
 *
 *   { "clientId": "123", "clientPublicKey" : "e0c5f66f1306ef1aeeb744ef38abaa28bb6c836c2ab0124d93dd9586cae8dd17"}
 * @example Successful response with generated client id of 123:
 *   HTTP/1.1 201 Created
 *   Location: /123/spdz-connection
 * @example Error response:
 *   HTTP/1.1 400 Bad Requst
 *   {
 *     status: 400,
 *     message: Socket for client 123 received error. ECONNREFUSED.
 *   }
 * @access public
 */
router.post('/connect-to-spdz', (req, res, next) => {
  const clientId = req.body.clientId
  const clientPublicKey = req.body.clientPublicKey
  spdzEngine
    .setupConnection(clientId, clientPublicKey)
    .then(generatedClientId => {
      res
        .status(201)
        .location(`${req.baseUrl}/${generatedClientId}/spdz-connection`)
        .send()
    })
    .catch(err => {
      err.status = HttpStatus.BAD_REQUEST
      next(err)
    })
})

/**
 * @description GET /:clientId/spdz-connection. Check client to SPDZ connection.
 * @alias restGetSpdzConnection
 * @param {String} clientId  Client id returned by previous /connect-to-spdz call.
 *
 * @example Sending the request:
 *   GET /123/spdz-connection
 * @example Successful response:
 *   HTTP/1.1 200 Ok
 * @example Error response:
 *   HTTP/1.1 404 Not Found
 *   {
 *     status: 404,
 *     message: No connection found for client id 123.
 *   }
 * @access public
 */
router.get('/:clientId/spdz-connection', (req, res, next) => {
  const clientId = req.params.clientId
  if (spdzEngine.checkConnection(clientId)) {
    res.status(HttpStatus.OK).send('')
  } else {
    const err = new Error(`No connection found for client id ${clientId}.`)
    err.status = HttpStatus.NOT_FOUND
    next(err)
  }
})

/**
 * @description DELETE /:clientId/spdz-connection. Close the socket connection to SPDZ.
 * @alias restDeleteSpdzConnection
 * @param {String} clientId  Client id returned by previous /connect-to-spdz call.
 *
 * @example Sending the request:
 *   DELETE /123/spdz-connection
 * @example Successful response:
 *   HTTP/1.1 200 Ok
 * @example Error response:
 *   HTTP/1.1 404 Not Found
 *   {
 *     status: 404,
 *     message: No connection found for client id 123.
 *   }
 * @access public
 */
router.delete('/:clientId/spdz-connection', (req, res, next) => {
  const clientId = req.params.clientId
  const result = spdzEngine.closeConnection(clientId)
  if (result === true) {
    res.status(HttpStatus.OK).send('')
  } else {
    const err = new Error(`No connection found for client id ${clientId}.`)
    err.status = HttpStatus.NOT_FOUND
    next(err)
  }
})

/**
 * @description POST /:clientId/consume-data?waitMs=1500. Consume and return SPDZ engine supplied data.
 * See SPDZ instructions sint.write_shares_to_socket, regint.write_to_socket.
 * @alias restConsumeData
 * @param {String} clientId  Client id returned by previous /connect-to-spdz call.
 * @param {Number} [waitMs=0] Optional query parameter, length of time in milliSecs to wait for data to become available.
 *
 * @return {Buffer} body data containing binary SPDZ data in little endian format.
 * Data is optionally encrypted depending on restConnectToSpdz parameters.
 *
 * @example Sending the request:
 *   POST /spdzapi/123/consume-data?waitMs=1000
 * @example Successful response:
 *   HTTP/1.1 200 Ok
 *   Content-Type: application/octet-stream
 *
 *   ...binary.....
 * @example Error response:
 *   HTTP/1.1 204 No Content
 *   {
 *      status: 204,
 *      message: No buffer records are availabe to send to client 123.
 *   }
 * @access public
 */
router.post('/:clientId/consume-data', (req, res, next) => {
  const clientId = req.params.clientId
  const waitMs = req.query.waitMs || 0

  try {
    let spdzData = spdzEngine.getServerTransmission(clientId)

    if (spdzData !== null) {
      res.status(HttpStatus.OK).send(spdzData)
    } else {
      if (waitMs > 0) {
        logger.debug(
          `No data to consume initially by client ${
            clientId
          }, going to wait for ${waitMs}ms.`
        )
        setTimeout(() => {
          // Need to handle exception here, exception propagation in async funcs does not work.
          let spdzData = null
          try {
            spdzData = spdzEngine.getServerTransmission(clientId)
          } catch (err) {
            logger.warn(
              `Got error in delayed consume, for client ${clientId}, error ${
                err.message
              }.`
            )
          }
          if (spdzData !== null) {
            logger.debug(
              `Found data to consume by client ${clientId}, after wait of ${
                waitMs
              }ms.`
            )
            res.status(HttpStatus.OK).send(spdzData)
          } else {
            logger.debug(
              `No data to consume by client ${clientId}, after wait of ${
                waitMs
              }ms.`
            )
            res.status(HttpStatus.NO_CONTENT).end()
          }
        }, waitMs)
      } else {
        res.status(HttpStatus.NO_CONTENT).end()
      }
    }
  } catch (err) {
    err.status = HttpStatus.NOT_FOUND
    next(err)
  }
})

/**
 * @description POST /:clientId/send-data. Send array of 128 bit big integers to SPDZ engine.
 * See SPDZ instruction cint, sint read_from_socket.
 * @alias restSendData
 * @param {String} clientId  Client id returned by previous /connect-to-spdz call.
 * @param {String} body JSON structure containing array of base64 encoded 16 bytes (big endian).
 * @example Sending the request:
 *   POST /spdzapi/123/send-data
 *   Host: my-domain:8080
 *   Content-Type: 'application/json; charset=utf-8'
 *
 *   [
 *     'J72LqIgKBjKu5zFKt1vo4g==',
 *     'J72LqIgKBjKu5zFKt1vo4g=='
 *   ]
 * @example Successful response:
 *   HTTP/1.1 200 Ok
 * @example Error response:
 *   HTTP/1.1 400 Bad Request
 *   {
 *      status: 400,
 *      message: Unable to process data as expecting a JSON array of base64 encoded integers.
 *   }
 * @access public
 */
router.post('/:clientId/send-data', (req, res, next) => {
  const clientId = req.params.clientId

  if (req.body instanceof Array) {
    if (spdzEngine.sendBigIntegers(clientId, req.body)) {
      res.status(HttpStatus.OK).end()
    } else {
      const err = new Error('Unable to send data to SPDZ engine.')
      err.status = HttpStatus.INTERNAL_SERVER_ERROR
      next(err)
    }
  } else {
    const err = new Error(
      'Unable to process data as expecting a JSON array of base64 encoded integers.'
    )
    err.status = HttpStatus.BAD_REQUEST
    next(err)
  }
})

// Must come last to handle 404s (for api only)
router.use(function(req, res, next) {
  const err = new Error(
    `Using ${req.method} against path ${req.path} is not part of the api.`
  )
  err.status = HttpStatus.NOT_FOUND
  next(err)
})

// Error handler - note next is needed as param.
router.use((err, req, res, next) => {
  // Only providing error stack to client in development
  const stack = environ === 'development' ? err.stack : {}
  const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR

  logger.warn('Got a REST error.', status, err.message)
  logger.debug(stack)
  res.status(status).json({
    status: status,
    message: err.message,
    stack: stack
  })
})

module.exports = spdzEngineInterface => {
  spdzEngine = spdzEngineInterface
  return router
}
