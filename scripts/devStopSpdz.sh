#!/bin/bash
# Stop a SPDZ process.
# This is used in dev to bypass stoping SPDZ - run it manually.
HERE=$(cd `dirname $0`; pwd)

PLAYER_ID=${1:-"none"}
FORCE_STOP=${2:-"N"}
CONTAINER_NAME="spdz-analytics-$PLAYER_ID"

if [ "$PLAYER_ID" == "none" ]; then
  (>&2 echo "No player id given.")
  exit 1
fi

if [ "$FORCE_STOP" != "Y" -a "$FORCE_STOP" != "N" ]; then
  (>&2 echo "Force stop must be Y or N")
  exit 1
fi

echo "Not stopping SPDZ container as running in Dev mode."

exit 0
