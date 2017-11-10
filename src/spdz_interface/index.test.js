'use strict'

let moduleUnderTest = require('../spdz_interface')
let logger = require('../support/logging')
logger.level = 'error'

jest.mock('./spdzSockets') // mock all exports in this module
const spdzSockets = require('./spdzSockets') // get hold of functions to provide manual mocks

describe('The spdz interface', () => {
  afterEach(() => {
    spdzSockets.sendData.mockClear()
    spdzSockets.setupConnection.mockClear()
    spdzSockets.checkConnection.mockClear()
  })

  it('can send a list of base64 encoded bigintegers', () => {
    const buf = Buffer.from([0xe2, 0xe8])
    const bufHex = buf.toString('base64') // expect 4ug=
    const bufForSpdz = Buffer.from(
      '10000000e8e20000000000000000000000000000',
      'hex'
    )

    spdzSockets.sendData.mockImplementationOnce(() => true)

    expect(moduleUnderTest.sendBigIntegers(35, [bufHex])).toBeTruthy()
    expect(spdzSockets.sendData).toHaveBeenCalledWith(35, bufForSpdz)

    spdzSockets.sendData.mockClear()
  })

  it('will throw an error if trying to get server data without setup', () => {
    const testThrows = () => moduleUnderTest.getServerTransmission(55)

    expect(testThrows).toThrowError(
      'Unable to get data for client 55, there is no SPDZ socket connection.'
    )
  })

  it('can setup a new client connection using public key as client id', done => {
    const examplePublicKey =
      '100000023000000450000006700000089000000ab000000cd000000ef0000000'
    // key has each 4 bytes reversed.
    const examplePayload = Buffer.from(
      '20000000020000100400003006000050080000700a0000900c0000b00e0000d0000000f0',
      'hex'
    )

    spdzSockets.sendData.mockImplementation(() => true)
    spdzSockets.setupConnection.mockImplementation(() => {
      const net = require('net')
      return Promise.resolve(new net.Socket())
    })

    moduleUnderTest
      .setupConnection(examplePublicKey, examplePublicKey)
      .then(() => {
        expect(spdzSockets.setupConnection).toHaveBeenCalledTimes(1)
        expect(spdzSockets.sendData).toHaveBeenCalledTimes(1)
        expect(spdzSockets.sendData).toHaveBeenCalledWith(
          examplePublicKey,
          examplePayload
        )
        expect(
          moduleUnderTest.getServerTransmission(examplePublicKey)
        ).toBeNull()
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })

  it('can setup a new client connection, generating client id, no encryption', done => {
    spdzSockets.setupConnection.mockImplementation(() => {
      const net = require('net')
      return Promise.resolve(new net.Socket())
    })

    moduleUnderTest
      .setupConnection()
      .then(clientId => {
        expect(clientId).toEqual(1)
        expect(spdzSockets.setupConnection).toHaveBeenCalledTimes(1)
        expect(spdzSockets.sendData).toHaveBeenCalledTimes(0)
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })

  it('will close the connection first if it already exists', done => {
    const examplePublicKey =
      '100000023000000450000006700000089000000ab000000cd000000ef0000000'

    spdzSockets.checkConnection.mockImplementation(() => {
      return true
    })

    moduleUnderTest
      .setupConnection(examplePublicKey)
      .then(() => {
        expect(spdzSockets.closeConnection).toHaveBeenCalledWith(
          examplePublicKey
        )
        done()
      })
      .catch(err => {
        done.fail(err)
      })
  })
})
