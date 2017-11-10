/**
 * Run the test server side websocket code in a real http web server.
 */
'use strict'

const http = require('http')
const Io = require('socket.io')
const IoClient = require('socket.io-client')

const setupSpdzInteraction = require('./')

jest.mock('../spdz_interface')
const mockSpdzEngine = require('../spdz_interface')

let webServer
let socket

beforeAll(() => {
  webServer = http.createServer().listen(8099)
  const io = new Io(webServer, { path: '/spdz/socket.io' })
  setupSpdzInteraction(io, '/spdzapi', mockSpdzEngine)
})

afterAll(() => {
  webServer.close()
})

beforeEach(done => {
  socket = IoClient('http://localhost:8099/spdzapi', {
    path: '/spdz/socket.io',
    reconnection: false
  })

  socket.once('connect', () => {
    done()
  })
})

afterEach(() => {
  socket.disconnect()
  mockSpdzEngine.checkConnection.mockClear()
  mockSpdzEngine.setupConnection.mockClear()
  mockSpdzEngine.closeConnection.mockClear()
  mockSpdzEngine.sendBigIntegers.mockClear()
  mockSpdzEngine.sendIntegers.mockClear()
})

describe('Web socket interface', () => {
  it('Can respond to an isSpdzConnected event', done => {
    mockSpdzEngine.checkConnection.mockImplementationOnce(() => true)

    socket.on('isSpdzConnected_result', result => {
      try {
        expect(result.status).toEqual(0)
        done()
      } catch (err) {
        done.fail(err)
      }
    })

    socket.emit('isSpdzConnected')
  })

  it('Can respond to a successful connectToSpdz event', done => {
    mockSpdzEngine.setupConnection.mockImplementationOnce(() =>
      Promise.resolve()
    )

    socket.on('connectToSpdz_result', result => {
      try {
        expect(result.status).toEqual(0)
        expect(mockSpdzEngine.setupConnection).toBeCalled()
        expect(mockSpdzEngine.setupConnection.mock.calls[0][1]).toBe('pubkey')
        done()
      } catch (err) {
        done.fail(err)
      }
    })

    socket.emit('connectToSpdz', 'pubkey')
  })

  it('Can respond to an unsuccessful connectToSpdz event', done => {
    mockSpdzEngine.setupConnection.mockImplementationOnce(() =>
      Promise.reject(new Error('Testing rejection'))
    )

    socket.on('connectToSpdz_result', result => {
      try {
        expect(result.status).toEqual(1)
        expect(result.err).toEqual('Testing rejection')
        done()
      } catch (err) {
        done.fail(err)
      }
    })

    socket.emit('connectToSpdz', 'pubkey', false)
  })

  it('Can respond to a disconnectFromSpdz event', done => {
    mockSpdzEngine.closeConnection.mockImplementationOnce(() => true)

    socket.on('disconnectFromSpdz_result', result => {
      try {
        expect(result.status).toEqual(0)
        done()
      } catch (err) {
        done.fail(err)
      }
    })

    socket.emit('disconnectFromSpdz')
  })

  it('Can respond to a successful sendData event of modp integers', done => {
    mockSpdzEngine.sendBigIntegers.mockImplementationOnce(() => true)

    socket.on('sendData_result', result => {
      try {
        expect(result.status).toEqual(0)
        done()
      } catch (err) {
        done.fail(err)
      }
    })

    socket.emit('sendData', 'modp', ['a12b', 'erf='])
  })

  it('Can respond to a successful sendData event of int32 integers', done => {
    mockSpdzEngine.sendIntegers.mockImplementationOnce(() => true)

    socket.on('sendData_result', result => {
      try {
        expect(result.status).toEqual(0)
        done()
      } catch (err) {
        done.fail(err)
      }
    })

    socket.emit('sendData', 'int32', [123, 456])
  })

  it('Can respond to an unsuccessful sendData event, sfloat and not an array', done => {
    socket.on('sendData_result', result => {
      try {
        expect(result.status).toEqual(1)
        expect(result.err).toEqual(
          'Unable to process sendData request, unexpected data type sfloat or input type.'
        )
        done()
      } catch (err) {
        done.fail(err)
      }
    })

    socket.emit('sendData', 'sfloat', 'a12b')
  })

  it('Can respond to an unsuccessful sendData event, modp send error', done => {
    mockSpdzEngine.sendBigIntegers.mockImplementationOnce(() => false)

    socket.on('sendData_result', result => {
      try {
        expect(result.status).toEqual(1)
        expect(result.err).toEqual('Unable to send data (modp) to SPDZ engine.')
        done()
      } catch (err) {
        done.fail(err)
      }
    })

    socket.emit('sendData', 'modp', ['a12b', 'erf='])
  })
})
