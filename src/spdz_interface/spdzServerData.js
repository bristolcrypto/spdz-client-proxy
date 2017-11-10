/**
 * Buffer data sent by server before being consumed by client.
 * Buffered data is stored as a fifo list of Buffer[N] (is a Uint8Array[N])
 * Typically either unencrytped 128 bit big int numbers or an encrypted stream.
 * Note numbers are stored as recevied in little endian format (least significant byte first).
 * Acts as an event emitter, sending message_from_spdz event when a new SPDZ message is available to consume.
 */
'use strict'

let EventEmitter = require('events').EventEmitter
const logger = require('../support/logging')
let spdzDataConversion = require('./spdzDataConversion')

class SpdzServerData extends EventEmitter {
  constructor(clientId) {
    super()
    this.clientId = clientId
    // The fifo of big int buffers received from SPDZ engine
    this.serverTransmission = []
    // Based on the last payload length seen, how many payload bytes are yet to arrive
    this.expectedBytes = 0
    // If the last chunk did not contain all the bytes expected, hold here until the remaining bytes arrives.
    this.incompleteTransmission = Buffer.alloc(0)
  }

  /**
   * Store a complete message from SPDZ and notify any listeners that a message arrived. 
   * Sends message_from_spdz to listeners, but not the message contents.
   * @param {Buffer} message 
   */
  storeTransmission(message) {
    this.serverTransmission.push(message)
    this.emit('message_from_spdz')
  }
  /**
   * Store the chunk of data into a server transmission array.
   * Note a server package of data may be split into unknown chunks during transmission and these are
   *  split/recombined according to the payload header which indicates expected bytes.
   * @param {Buffer} chunk  A Buffer is also a Uint8Array
   */
  storeChunk(chunk) {
    const result = spdzDataConversion.extractPayloadFromBuffer(
      chunk,
      this.expectedBytes,
      this.incompleteTransmission
    )

    logger.silly(
      `Received payload ${result.payload.toString('hex')} for client ${this
        .clientId}.`
    )
    this.expectedBytes = result.expectedBytes

    if (result.expectedBytes === 0) {
      // Got a complete transmission so store
      this.storeTransmission(result.payload)
      this.incompleteTransmission = result.remainingChunk

      if (this.incompleteTransmission.length > 0) {
        // This chunk has remaining data which can be treated as a new transmission
        let newTransmissionBuf = this.incompleteTransmission
        this.incompleteTransmission = Buffer.alloc(0)
        this.storeChunk(newTransmissionBuf)
      }
    } else {
      // Incomplete transmission, hold what got and have to wait for next chunk
      this.incompleteTransmission = result.payload
    }
  }

  /**
   * Get earliest server transmission or null if none.
   */
  popServerTransmission() {
    if (this.serverTransmission.length > 0) {
      return this.serverTransmission.splice(0, 1)[0]
    } else {
      return null
    }
  }

  getExpectedBytes() {
    return this.expectedBytes
  }

  isEmpty() {
    return this.serverTransmission.length === 0
  }
}

module.exports = SpdzServerData
