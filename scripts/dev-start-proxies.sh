#!/bin/bash
# Start n proxies on localhost for testing.

ENGINE_COUNT=${1:-2}
SERVER_BASE_PORT=${2:-3010}
SPDZ_BASE_PORT=${3:-14000}
LOGGING_LEVEL=${4:-debug}
INTERFACE=${5:-websocket}

HERE=$(cd `dirname $0`; pwd)
PROXYROOT=$HERE/..

if ! test -e $PROXYROOT/logs; then
    mkdir $PROXYROOT/logs
fi

for i in $(seq 0 $(($ENGINE_COUNT - 1))); do
  spdz_port=$(($SPDZ_BASE_PORT+$i))
  server_port=$(($SERVER_BASE_PORT+$i))
  start_script=$HERE/devStartSpdz.sh
  stop_script=$HERE/devStopSpdz.sh
  player_id=$i

  NODE_ENV=development LOG_LEVEL=$LOGGING_LEVEL SPDZ_HOST=localhost SPDZ_PORT=$spdz_port SERVER_PORT=$server_port INTERFACE=$INTERFACE START_SCRIPT=$start_script STOP_SCRIPT=$stop_script PLAYER_ID=$player_id node src/index.js > $PROXYROOT/logs/spdzproxy_$server_port.log 2>&1 &
  echo $! > $PROXYROOT/logs/spdzproxy_$server_port.pid
  echo "Started spdz-client-proxy to port $spdz_port on server port $server_port, pid $!."
done
