/**
 * Run a web server to proxy requests to a SPDZ engine.
 * Runs in rest mode (INTERFACE = rest) to service http rest requests
 *  or in websocket mode (INTERFACE = websocket, default) to service 
 *  websocket requests.
 * Deploy behind nginx reverse proxy to support SSL connections.
 */
'use strict'

const express = require('express')
const http = require('http')
const Io = require('socket.io')

const spdzEngine = require('./spdz_interface')
const restApi = require('./rest_api')
const setupSpdzInteraction = require('./socket_api')
const setupSpdzBootstrap = require('./spdz_bootstrap')
const logger = require('./support/logging')

const spdzHostName = process.env.SPDZ_HOST || 'localhost'
const spdzPortNum = process.env.SPDZ_PORT || '14000'
const portNum = process.env.SERVER_PORT || '8080'
const serverType = process.env.INTERFACE || 'websocket'
const startScript = process.env.START_SCRIPT || 'no-start-script-specified'
const stopScript = process.env.STOP_SCRIPT || 'no-stop-script-specified'
const playerId = process.env.PLAYER_ID || '0'

spdzEngine.init(spdzHostName, spdzPortNum)
logger.info(`Running as a proxy for SPDZ engine ${spdzHostName}:${spdzPortNum} with player id ${playerId}.`)
logger.info(`   startScript is ${startScript}`)
logger.info(`   stopScript is ${stopScript}`)

logger.debug('Using debug logging.')

const app = express()
app.disable('x-powered-by')

const webServer = http.createServer(app)

if (serverType === 'websocket') {
  const io = new Io(webServer, { path: '/spdz/socket.io' })
  setupSpdzInteraction(io, '/spdzapi', spdzEngine)
  setupSpdzBootstrap(io, '/spdzstart', startScript, stopScript, playerId)
} else {
  app.use('/spdzapi', restApi(spdzEngine))
}

webServer.listen(portNum, () => {
  logger.info(`Listening on port ${portNum} for ${serverType} requests.`)
})
