'use strict'

let ModuleUnderTest = require('./spdzServerData')

describe('I can read, store and retrieve server supplied byte data', () => {
  let moduleUnderTest

  beforeEach(() => {
    moduleUnderTest = new ModuleUnderTest(44)
  })

  it('is empty when first created', () => {
    expect(moduleUnderTest.isEmpty()).toBeTruthy()
  })

  it('receives 1 transmission in 1 chunk', () => {
    let chunk = Buffer.alloc(36, 4)
    chunk[0] = 32
    chunk[1] = 0
    chunk[2] = 0
    chunk[3] = 0
    moduleUnderTest.storeChunk(chunk)

    expect(moduleUnderTest.isEmpty()).toBeFalsy()

    const serverTransmission = moduleUnderTest.popServerTransmission()

    expect(serverTransmission).not.toBeNull()
    expect(serverTransmission.length).toEqual(32)
    expect(moduleUnderTest.getExpectedBytes()).toEqual(0)

    expect(moduleUnderTest.popServerTransmission()).toBeNull()
    expect(moduleUnderTest.isEmpty()).toBeTruthy()
  })

  it('receives 1 transmission in 2 chunks', () => {
    let chunk1 = Buffer.alloc(32, 4)
    chunk1[0] = 50
    chunk1[1] = 0
    chunk1[2] = 0
    chunk1[3] = 0
    moduleUnderTest.storeChunk(chunk1)

    expect(moduleUnderTest.popServerTransmission()).toBeNull()

    moduleUnderTest.storeChunk(Buffer.alloc(22, 5))

    const serverTransmission = moduleUnderTest.popServerTransmission()
    expect(serverTransmission).not.toBeNull()
    expect(serverTransmission.length).toEqual(50)
    expect(moduleUnderTest.getExpectedBytes()).toEqual(0)
  })

  it('receives 1 transmission in 1 chunk, twice', () => {
    let chunk1 = Buffer.alloc(10, 0)
    chunk1[0] = 6
    moduleUnderTest.storeChunk(chunk1)

    let chunk2 = Buffer.alloc(35, 0)
    chunk2[0] = 31
    moduleUnderTest.storeChunk(chunk2)

    const serverTransmission1 = moduleUnderTest.popServerTransmission()
    expect(serverTransmission1).not.toBeNull()
    expect(serverTransmission1.length).toEqual(6)

    const serverTransmission2 = moduleUnderTest.popServerTransmission()
    expect(serverTransmission2).not.toBeNull()
    expect(serverTransmission2.length).toEqual(31)
  })

  it('receives 2 transmissions spread over 3 chunks', () => {
    let chunk1 = Buffer.alloc(24, 0)
    chunk1[0] = 30
    moduleUnderTest.storeChunk(chunk1)

    let chunk2 = Buffer.alloc(24, 0)
    chunk2[10] = 32
    moduleUnderTest.storeChunk(chunk2)

    let chunk3 = Buffer.alloc(22, 0)
    moduleUnderTest.storeChunk(chunk3)

    const serverTransmission1 = moduleUnderTest.popServerTransmission()
    expect(serverTransmission1).not.toBeNull()
    expect(serverTransmission1.length).toEqual(30)

    const serverTransmission2 = moduleUnderTest.popServerTransmission()
    expect(serverTransmission2).not.toBeNull()
    expect(serverTransmission2.length).toEqual(32)
  })

  it('notifies a listener when transmission is received', () => {
    let chunk = Buffer.alloc(36, 0)
    chunk[0] = 32

    const mockCallBack = jest.fn()

    moduleUnderTest.on('message_from_spdz', () => {
      mockCallBack()
    })

    moduleUnderTest.storeChunk(chunk)

    expect(mockCallBack).toHaveBeenCalled()
  })
})
