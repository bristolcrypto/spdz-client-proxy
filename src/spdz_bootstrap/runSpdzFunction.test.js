const runSPDZFunction = require('./runSpdzFunction')

const startScript = './test_start.sh'
const stopScript = './test_stop.sh'
const playerId = 1

describe('Start a SPDZ Function', () => {
  const testName = (done, pgmName) => {
    runSPDZFunction(startScript, stopScript, playerId, pgmName)
      .then(() => {
        done.fail('Expected startSPDZFunction to throw error.')
      })
      .catch(err => {
        try {
          expect(err.message).toEqual(
            'SPDZ Program name must be a string less than 20 chars.'
          )
        } catch (othererr) {
          done.fail(othererr)
        }
        done()
      })
  }

  it('Checks for a SPDZ function name undefined', done => {
    testName(done)
  })
  it('Checks for a SPDZ function name not a string', done => {
    testName(done, 12)
  })
  it('Checks for a SPDZ function name longer than 0 chars', done => {
    testName(done, '')
  })
  it('Checks for a SPDZ function name shorter than 20 chars', done => {
    testName(done, '01234567890123456789')
  })
  it('Checks for a valid SPDZ function name, but invalid script name.', done => {
    runSPDZFunction(startScript, stopScript, playerId, 'spdz_Func1')
      .then(() => {
        done.fail('Expected startSPDZFunction to throw error.')
      })
      .catch(err => {
        try {
          expect(err.message).toEqual(
            '/bin/sh: ./test_stop.sh: No such file or directory\n'
          )
        } catch (othererr) {
          done.fail(othererr)
        }
        done()
      })
  })
})
