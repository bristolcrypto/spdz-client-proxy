'use strict'

let moduleUnderTest = require('./spdzSockets')
const logger = require('../support/logging')
logger.level = 'error'

let sinon = require('sinon')
let EventEmitter = require('events').EventEmitter
let net = require('net')

describe('I create and close socket connections', () => {
  // Need to stub out net.connect with own event emitter to take back control
  let fakeSocket

  beforeEach(() => {
    // Got stuck with Jest mocks, so tried sinon stubs.
    fakeSocket = new EventEmitter()
    fakeSocket.connect = config => {} // do nothing, emit events to simulate result
    fakeSocket.destroy = () => {
      fakeSocket.emit('close')
    } // simulate ending socket
    fakeSocket.write = data => {
      return true
    } // simulate sending data
    fakeSocket.setNoDelay = () => {}
    sinon.stub(net, 'Socket', () => {
      return fakeSocket
    })
  })

  afterEach(() => {
    // remove sinon stubbing
    net.Socket.restore()
    // Because manageSockets holds state but require includes as a singleton.
    jest.resetModules()
  })

  it('rejects a socket connection with a fake error event', () => {
    moduleUnderTest
      .setupConnection(1, 'localhost', 12345)
      .then(actualSocket => {
        expect(actualSocket).toBeFalsy()
      })
      .catch(err => {
        expect(err.code).toEqual('ECONNREFUSED')
      })

    // Faked error event
    fakeSocket.emit('error', { code: 'ECONNREFUSED' })
  })

  it('allows a socket connection with fake connect event', () => {
    moduleUnderTest
      .setupConnection(1, 'localhost', 12345)
      .then(actualSocket => {
        expect(actualSocket._eventsCount).toEqual(fakeSocket._eventsCount)
      })
      .catch(err => {
        expect(err).toBeFalsy()
      })

    // Faked connect event
    fakeSocket.emit('connect')
  })

  it('allows a socket connection to be closed', () => {
    moduleUnderTest
      .setupConnection(2, 'localhost', 12345)
      .then(actualSocket => {
        expect(actualSocket._eventsCount).toEqual(fakeSocket._eventsCount)
      })
      .catch(err => {
        expect(err).toBeFalsy()
      })

    // Faked connect event
    fakeSocket.emit('connect')

    expect(moduleUnderTest.closeConnection(2)).toBeTruthy()
    expect(moduleUnderTest.closeConnection(999)).toBeFalsy()
  })

  it('allows data to be sent to a socket', () => {
    moduleUnderTest
      .setupConnection(3, 'localhost', 12345)
      .then(actualSocket => {
        expect(actualSocket._eventsCount).toEqual(fakeSocket._eventsCount)
      })
      .catch(err => {
        expect(err).toBeFalsy()
      })

    // Faked connect event
    fakeSocket.emit('connect')

    expect(moduleUnderTest.sendData(3, 'some data')).toBeTruthy()
    expect(moduleUnderTest.sendData(4, 'some data')).toBeFalsy()
  })
})
