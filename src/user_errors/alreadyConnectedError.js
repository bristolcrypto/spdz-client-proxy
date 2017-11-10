// Specialised Error to represent client already connected.

function AlreadyConnectedError(message) {
  this.name = 'AlreadyConnectedError'
  this.message = message || 'Client already connected to SPDZ engine.'
  this.stack = new Error().stack
}
AlreadyConnectedError.prototype = Object.create(Error.prototype)
AlreadyConnectedError.prototype.constructor = AlreadyConnectedError

module.exports = AlreadyConnectedError
