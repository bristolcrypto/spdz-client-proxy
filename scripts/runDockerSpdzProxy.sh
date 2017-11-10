#!/bin/bash

# Dev example
docker run -d --rm --name spdz-client-proxy-0 --network=spdz_nw -p 3010:8080 -e "PLAYER_ID=0" -e "INTERFACE=websocket" -e "SPDZ_HOST=spdz-bankers-0" -e "SPDZ_PORT=14000" -e "LOG_LEVEL=debug" -v /var/run/docker.sock:/var/run/docker.sock -v $(pwd)/scripts:/usr/app/scripts -v $(pwd)/logs:/usr/app/logs spdz/spdz-client-proxy:snapshot

docker run -d --rm --name spdz-client-proxy-1 --network=spdz_nw -p 3011:8080 -e "PLAYER_ID=1" -e "INTERFACE=websocket" -e "SPDZ_HOST=spdz-bankers-1" -e "SPDZ_PORT=14001" -e "LOG_LEVEL=debug" -v /var/run/docker.sock:/var/run/docker.sock -v $(pwd)/scripts:/usr/app/scripts -v $(pwd)/logs:/usr/app/logs spdz/spdz-client-proxy:snapshot
