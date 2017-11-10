'use strict'

let moduleUnderTest = require('./spdzDataConversion')

describe('I can work out the payload length from the header', () => {
  it('converts first 4 bytes into payload length', () => {
    expect(
      moduleUnderTest.payloadLengthFromHeader(Buffer.from([32, 1, 0, 0]))
    ).toEqual(288)
    expect(
      moduleUnderTest.payloadLengthFromHeader(Buffer.from([16, 1, 3, 5]))
    ).toEqual(84082960)
  })

  it('expects a payload length of at least 4 bytes', () => {
    const testThrows = () =>
      moduleUnderTest.payloadLengthFromHeader(Buffer.from([32, 1, 0]))
    expect(testThrows).toThrowError(
      'A new server transmission must include a 4 byte length header, actual buffer length 3. Ignoring data.'
    )
  })
})

describe('I can convert base64 encoded strings into a binary buffer', () => {
  it('converts a single base64 encoded string', () => {
    const buf = moduleUnderTest.base64ToSpdz(['4ug=']) // encoding of 0xe2e8
    expect(buf.length).toEqual(20)
    expect(buf.toString('hex')).toEqual(
      '10000000e8e20000000000000000000000000000'
    )
  })

  it('converts 2 base64 encoded strings', () => {
    const buf = moduleUnderTest.base64ToSpdz([
      'J72LqIgKBjKu5zFKt1vo4g==',
      '4ug='
    ])
    expect(buf.length).toEqual(36)
    expect(buf.toString('hex')).toEqual(
      '20000000e2e85bb74a31e7ae32060a88a88bbd27e8e20000000000000000000000000000'
    )
  })
})

describe('I can send an array of 32 bit integers to the SPDZ engine', () => {
  it('converts an integer into an 8 byte buffer', () => {
    const buf = moduleUnderTest.int32ToSpdz([67])
    expect(buf.length).toEqual(8)
    expect(buf.toString('hex')).toEqual('0400000043000000')
  })
})

describe('I can convert client public keys into a sequence of 32 bit integers', () => {
  it('converts a 32 byte public key into a header + 8 * 4 bytes each in little endian order', () => {
    const buf = moduleUnderTest.hexPublicKeyToBuffer(
      '0000000100000002000000030000000400000005000000060000000700000008'
    )
    expect(buf.length).toEqual(36)
    expect(buf.toString('hex')).toEqual(
      '200000000100000002000000030000000400000005000000060000000700000008000000'
    )
  })

  it('throws an exception if the hex string is not a multiple of 8 hex bytes', () => {
    const testThrows = () =>
      moduleUnderTest.hexPublicKeyToBuffer('900fac89aaeb34')
    expect(testThrows).toThrowError(
      'Expect hex string to be length 64 representing 256 bit public key, given length 14.'
    )
  })
})
