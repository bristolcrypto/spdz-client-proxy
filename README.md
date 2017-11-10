# spdz-client-proxy

## Features

A proxy which runs in front of a single SPDZ engine (SPDZ process) to provide a web friendly interface to allow external clients to provide input and receive output. The proxy has:

1.  A REST based API and a Web Sockets API, to allow other processes to interact with a SPDZ engine.
2.  A stateful TCP socket connection to the SPDZ engine. 
3.  Packing and unpacking data into the binary formats expected by SPDZ.
4.  A buffer to store payloads sent from the SPDZ engine over a TCP socket where a complete message has not been received.
5.  Is agnostic to the contents of the SPDZ traffic, other than expecting a 4 byte payload length header in messages. It has no domain knowledge about data formats and so is suitable for any number of applications.
6.  Provides an additional interface to bootstrap SPDZ processes.

## API interfaces

There are 3 API interfaces:

- a Web Socket interface which is the recommended API,
- a REST interface which is a legacy interface and not as fully featured as the Web Socket interface,
- a Bootstrap interface for use cases where the client needs to start and stop the SPDZ engine process.

See the [generated apidoc](./api.md) created with `npm run apidoc`.

In all cases it is strongly recommended to use the spdz-client-lib as a Javascript client library to access the SPDZ Proxy API. This provides functions to parse the SPDZ binary data formats as well as combination functions to manage async access to multiple SPDZ Proxies.

## Requirements

-   node.js, tested against v8.6
-   other library dependencies are listed in the package.json files. Use `npm install` to pull these down.

### Dependency on SPDZ:

| spdz-client-proxy | spdz-2 |
| ----------------- | ------ |
| v0.1.0            | v0.0.2 |

## Deployment

To run 2 SPDZ proxies in a dev environment on a single host see `Scripts/dev-start-proxies.sh`.

See the `Dockerfile` for build instructions and `Scripts/runDockerSpdzProxy.sh` to run it.

Run time options are passed in via environment varibles:

-   `SPDZ_HOST` : the hostname of the SPDZ engine, default is 'localhost'
-   `SPDZ_PORT` : the portnumber of the SPDZ engine, default is '14000'
-   `SERVER_PORT` : the port that API interfaces are served on, default is '8080'
-   `INTERFACE` : run the proxy with the 'websocket' or 'rest' interface
-   `START_SCRIPT` : the script to run when using the bootstrap interface to start a SPDZ process (optional)
-   `STOP_SCRIPT` : the script to run when using the bootstrap interface to stop a SPDZ process (optional)
-   `PLAYER_ID` : the player id used by the bootstrap interface (optional)
