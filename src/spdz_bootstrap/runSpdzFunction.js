/**
 * Start a SPDZ program on demand, using predefined scripts.
 * See scripts/spdzBootstrapConfig.json.
 */
const { exec } = require('child_process')
const logger = require('../support/logging')

/**
 * Create a promise that resolves when script with params is run.
 * @param {String} script full path name 
 * @param {Array<String>} params to pass to script 
 */
const runScript = (script, ...params) => {
  return new Promise((resolve, reject) => {
    let errorMessages = []
    const child_process = exec(`${script} ${params.join(' ')}`)

    child_process.stdout.on('data', msg => {
      logger.debug(`Script ${script} ${params.join(' ')} stdout msg : ${msg}`)
    })

    child_process.stderr.on('data', msg => {
      logger.debug(`Script ${script} ${params.join(' ')} stderr msg : ${msg}`)
      errorMessages.push(msg)
    })

    child_process.on('close', code => {
      if (code === 0) {
        logger.debug(`Successfully ran script ${script} ${params.join(' ')}.`)
        resolve()
      } else {
        reject(new Error(errorMessages.join(' ')))
      }
    })
  })
}

/**
 * Run file system script to stop a running SPDZ program and start a new one.
 * 
 * @param {Object} bootstrapConfig with keys stopScript and startScript 
 *                 to full path names of scripts to run.
 * @param {String} spdzProgram name of compiled SPDZ program 
 * @param {boolean} force_stop If already running force stop the SPDZ program. 
 */
const runSPDZFunction = (
  startScript,
  stopScript,
  playerId,
  spdzProgram,
  force_stop = true
) => {
  //Sanitise spdzProgram name
  if (
    spdzProgram !== undefined &&
    (typeof spdzProgram === 'string' || spdzProgram instanceof String) &&
    spdzProgram.length > 0 &&
    spdzProgram.length < 20
  ) {
    if (!/^[a-zA-Z0-9_]*$/.test(spdzProgram)) {
      return Promise.reject(new Error('SPDZ Program name not accepted.'))
    }
  } else {
    return Promise.reject(
      new Error('SPDZ Program name must be a string less than 20 chars.')
    )
  }

  return runScript(stopScript, playerId, force_stop ? 'Y' : 'N').then(() => {
    return runScript(startScript, playerId, spdzProgram)
  })
}

module.exports = runSPDZFunction
