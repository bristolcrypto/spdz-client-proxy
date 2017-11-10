#!/bin/bash
# Start a SPDZ process, passing in spdz program to run. 
# This is used in dev to bypass starting SPDZ - run it manually.

player_id=${1:-"none"}

if [ "$player_id" == "none" ]; then
  (>&2 echo "No player id given.")
  exit 1
fi

spdz_pgm=${2:-"none"}

if [ "$SPDZ_PGM" == "none" ]; then
  (>&2 echo "No spdz function name given.")
  exit 1
fi

echo "Not starting SPDZ container as running in Dev mode."

exit 0
