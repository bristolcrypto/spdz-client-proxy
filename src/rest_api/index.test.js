/**
 * Run integration style tests using supertest/superagent to send real http requests into
 * a running express http server. Follow on modules are mocked.
 */
'use strict'

const routerUnderTest = require('../rest_api')
const httptest = require('supertest')
const HttpStatus = require('http-status-codes')
const supertestWithJest = require('../support/supertestWithJest')
const express = require('express')
const logger = require('../support/logging')
logger.level = 'error'

jest.mock('../spdz_interface') // mock all exports in the module responsible for socket comms to spdz
const mockSpdzInterface = require('../spdz_interface') // get hold of functions to allow manual mocks

// Test with one instance of express
const app = express()
app.use('/', routerUnderTest(mockSpdzInterface))

// Be able to parse binary content into a Buffer with supertest/superagent
const binaryParser = (res, callback) => {
  res.data = ''

  res.setEncoding('binary')
  res.on('data', function(chunk) {
    res.data += chunk
  })
  res.on('end', function() {
    callback(null, Buffer.from(res.data, 'binary'))
  })
}

describe('The SPDZ proxy REST api', () => {
  describe('Provides a landing page and standard error handling', () => {
    it('displays text for the landing page', done => {
      httptest(app)
        .get('/')
        .end((err, res) => {
          supertestWithJest(err, res, done, () => {
            expect(res.status).toEqual(HttpStatus.OK)
            expect(res.text).toEqual(
              'You have reached the SPDZ Rest interface. See ....'
            )
          })
        })
    })

    it('returns a 404 for incorrect URL', done => {
      httptest(app)
        .get('/wrongresource')
        .end((err, res) => {
          supertestWithJest(err, res, done, () => {
            expect(res.status).toEqual(HttpStatus.NOT_FOUND)
            expect(res.body.message).toEqual(
              'Using GET against path /wrongresource is not part of the api.'
            )
          })
        })
    })
  })

  describe('Allows client socket connections to a SPDZ engine to be managed', () => {
    afterEach(() => {
      mockSpdzInterface.checkConnection.mockClear()
      mockSpdzInterface.setupConnection.mockClear()
      mockSpdzInterface.closeConnection.mockClear()
    })

    it('checks the status of a valid connection', done => {
      mockSpdzInterface.checkConnection.mockReturnValueOnce(true)

      httptest(app)
        .get('/24/spdz-connection')
        .end((err, res) => {
          supertestWithJest(err, res, done, () => {
            expect(res.status).toEqual(HttpStatus.OK)
            expect(res.text).toEqual('')
          })
        })
    })

    it('checks the status of a missing connection', done => {
      mockSpdzInterface.checkConnection.mockReturnValueOnce(false)

      httptest(app)
        .get('/24/spdz-connection')
        .end((err, res) => {
          supertestWithJest(err, res, done, () => {
            expect(res.status).toEqual(HttpStatus.NOT_FOUND)
            expect(res.body.message).toEqual(
              'No connection found for client id 24.'
            )
          })
        })
    })

    it('allows a client to create a connection, clientId generated', done => {
      mockSpdzInterface.setupConnection.mockImplementation(() => {
        return Promise.resolve(45)
      })

      httptest(app)
        .post('/connect-to-spdz')
        .type('json')
        .send({})
        .end((err, res) => {
          supertestWithJest(err, res, done, () => {
            expect(res.status).toEqual(HttpStatus.CREATED)
            expect(res.header.location).toEqual('/45/spdz-connection')
          })
        })
    })

    it('allows a client to create a connection, clientId provided', done => {
      const clientId = 123456
      mockSpdzInterface.setupConnection.mockImplementation(() => {
        return Promise.resolve(clientId)
      })

      httptest(app)
        .post('/connect-to-spdz')
        .type('json')
        .send({ clientId: `${clientId}` })
        .end((err, res) => {
          supertestWithJest(err, res, done, () => {
            expect(res.status).toEqual(HttpStatus.CREATED)
            expect(res.header.location).toEqual(`/${clientId}/spdz-connection`)
            expect(mockSpdzInterface.setupConnection).toHaveBeenCalledWith(
              `${clientId}`,
              undefined
            )
          })
        })
    })

    it('displays an error if the client cannot create a connection', done => {
      mockSpdzInterface.setupConnection.mockImplementation(() => {
        return Promise.reject(new Error('Fake connection error for testing.'))
      })

      httptest(app)
        .post('/connect-to-spdz')
        .end((err, res) => {
          supertestWithJest(err, res, done, () => {
            expect(res.status).toEqual(HttpStatus.BAD_REQUEST)
            expect(res.body.message).toEqual(
              'Fake connection error for testing.'
            )
          })
        })
    })

    it('allows a client to close a connection', done => {
      mockSpdzInterface.closeConnection.mockReturnValueOnce(true)

      httptest(app)
        .delete('/1/spdz-connection')
        .end((err, res) => {
          supertestWithJest(err, res, done, () => {
            expect(res.status).toEqual(HttpStatus.OK)
            expect(res.text).toEqual('')
          })
        })
    })

    it('displays an error if the client cannot close a connection', done => {
      mockSpdzInterface.closeConnection.mockReturnValueOnce(false)

      httptest(app)
        .delete('/1/spdz-connection')
        .end((err, res) => {
          supertestWithJest(err, res, done, () => {
            expect(res.status).toEqual(HttpStatus.NOT_FOUND)
            expect(res.body.message).toEqual(
              'No connection found for client id 1.'
            )
          })
        })
    })
  })

  describe('Allows clients to retrieve server transmissions from a SPDZ engine', () => {
    afterEach(() => {
      mockSpdzInterface.getServerTransmission.mockClear()
    })

    it('retrieves a transmission when one is available', done => {
      const exampleData = Buffer.from('e8e20000000000000000000000000000', 'hex')
      mockSpdzInterface.getServerTransmission.mockImplementationOnce(
        () => exampleData
      )

      httptest(app)
        .post('/23/consume-data')
        .buffer(true)
        .parse(binaryParser)
        .end((err, res) => {
          supertestWithJest(err, res, done, () => {
            expect(res.status).toEqual(HttpStatus.OK)
            expect(res.type).toEqual('application/octet-stream')
            expect(res.header['content-length']).toEqual('16')
            expect(res.body).toEqual(exampleData)
          })
        })
    })

    it('retrieves a transmission after a delay, first time not available', done => {
      const exampleData = Buffer.from('e8e20000000000000000000000000000', 'hex')
      mockSpdzInterface.getServerTransmission
        .mockImplementationOnce(() => null)
        .mockImplementationOnce(() => exampleData)

      httptest(app)
        .post('/23/consume-data')
        .query({ waitMs: '500' })
        .buffer(true)
        .parse(binaryParser)
        .end((err, res) => {
          supertestWithJest(err, res, done, () => {
            expect(res.status).toEqual(HttpStatus.OK)
            expect(res.type).toEqual('application/octet-stream')
            expect(res.header['content-length']).toEqual('16')
            expect(res.body).toEqual(exampleData)
          })
        })
    })

    it('does not retrieve a transmission when one is not available', done => {
      mockSpdzInterface.getServerTransmission.mockImplementationOnce(() => null)

      httptest(app)
        .post('/23/consume-data')
        .buffer(true)
        .parse(binaryParser)
        .end((err, res) => {
          supertestWithJest(err, res, done, () => {
            expect(res.status).toEqual(HttpStatus.NO_CONTENT)
          })
        })
    })

    it('displays an error when retrieving a transmission for an unknown client connection', done => {
      const errMsg =
        'Force failure of retrieving transmission for unknown client.'
      mockSpdzInterface.getServerTransmission.mockImplementationOnce(() => {
        throw new Error(errMsg)
      })

      httptest(app)
        .post('/999/consume-data')
        .end((err, res) => {
          supertestWithJest(err, res, done, () => {
            expect(res.status).toEqual(HttpStatus.NOT_FOUND)
            expect(res.body.message).toEqual(errMsg)
          })
        })
    })
  })

  describe('Allows clients to send data to the SPDZ engine', () => {
    afterEach(() => {
      mockSpdzInterface.sendBigIntegers.mockClear()
    })

    it('is able to send a JSON array of base64 values', done => {
      const examplePayloadData = [
        'J72LqIgKBjKu5zFKt1vo4g==',
        'J72LqIgKBjKu5zFKt1vo4g=='
      ]
      mockSpdzInterface.sendBigIntegers.mockReturnValueOnce(true)

      httptest(app)
        .post('/23/send-data')
        .type('json')
        .send(examplePayloadData)
        .end((err, res) => {
          supertestWithJest(err, res, done, () => {
            expect(res.status).toEqual(HttpStatus.OK)
            expect(mockSpdzInterface.sendBigIntegers).toHaveBeenCalledWith(
              '23',
              examplePayloadData
            )
          })
        })
    })

    it('will not except base64 values if not in an array', done => {
      const examplePayloadData = { value: 'J72LqIgKBjKu5zFKt1vo4g==' }

      httptest(app)
        .post('/23/send-data')
        .type('json')
        .send(examplePayloadData)
        .end((err, res) => {
          supertestWithJest(err, res, done, () => {
            expect(res.status).toEqual(HttpStatus.BAD_REQUEST)
            expect(res.body.message).toEqual(
              'Unable to process data as expecting a JSON array of base64 encoded integers.'
            )
          })
        })
    })

    it('displays an error if unable to send data', done => {
      const examplePayloadData = [
        'J72LqIgKBjKu5zFKt1vo4g==',
        'J72LqIgKBjKu5zFKt1vo4g=='
      ]
      mockSpdzInterface.sendBigIntegers.mockReturnValueOnce(false)

      httptest(app)
        .post('/23/send-data')
        .type('json')
        .send(examplePayloadData)
        .end((err, res) => {
          supertestWithJest(err, res, done, () => {
            expect(res.status).toEqual(HttpStatus.INTERNAL_SERVER_ERROR)
            expect(res.body.message).toEqual(
              'Unable to send data to SPDZ engine.'
            )
          })
        })
    })
  })
})
