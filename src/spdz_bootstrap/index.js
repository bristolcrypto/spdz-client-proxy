/**
 * Web socket events to manage bootstrapping a SPDZ process.
 * 
 * Note different namespace (spdzstart) to socket_api used to interact with a 
 * running SPDZ process.
 */
const logger = require('../support/logging')
const runSPDZFunction = require('./runSpdzFunction')

/**
 * Setup web socket server to manage boostrap commands
 * @param {httpServer} webserver to listen for websocket connections 
 */
const setupSpdzBootstrap = (
  io,
  namespace,
  startScript,
  stopScript,
  playerId
) => {
  const ns = io.of(namespace)

  ns.on('connection', socket => {
    logger.debug(`Socket ${socket.id} connected to SPDZ bootstrap.`)

    /**
     * @description Run a predefined script to stop a running Spdz process and start a new one. The stop and start scripts are defined at deploy time and the recommended approach is to use Docker containers. The start script is sent 2 parameters: player Id, SPDZ MPC Program Name. The stop script is sent 2 parameters: player Id, force Stop flag (Y/N).
     * @alias startSpdz
     * @param {String} spdzProgram The precompiled spdz program name, passed to the start script, and used where a Docker container contains multiple possible SPDZ programs.
     * @param {boolean} forceStop If true then indicate to the stop script that a running Spdz process must be stopped.
     * @return {String} event name startSpdz_result
     * @return {String} JSON response with {status : 0 (succes) | 1 (error), err : error message } 
     * @example Client code to start a SPDZ process:
     * 
     * socket.emit('startSpdz', 'my_mpc_program', true)
     * socket.on('startSpdz_result', response => {
     *   console.log(response.status, response.err)
     * })
     * @access public
     */
    socket.on('startSpdz', (spdzProgram, forceStop) => {
      runSPDZFunction(startScript, stopScript, playerId, spdzProgram, forceStop)
        .then(() => socket.emit('startSpdz_result', { status: 0 }))
        .catch(err => {
          socket.emit('startSpdz_result', { status: 1, err: err.message })
        })
    })

    socket.on('disconnect', () => {
      logger.debug(`Socket ${socket.id} disconnected from SPDZ bootstrap.`)
    })
  })
}

module.exports = setupSpdzBootstrap
