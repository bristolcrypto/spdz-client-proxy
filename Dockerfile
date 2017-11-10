FROM node:8.6

# Define build and run time for a SPDZ client proxy.
# Also includes docker cli to allow optional docker commands to host system, eg. start/stop spdz containers.
# Build container with:
#   docker build -t <repo>/spdz-client-proxy:vx.y.z .
# Run container with:
#   docker run -d --rm --name spdz-client-proxy -p 8080:8080 -e "PLAYER_ID=1" -e "SPDZ_HOST=1.2.3.4" 
#      -e "INTERFACE=websocket"
#      -e "SPDZ_PORT=14000" -e "LOG_LEVEL=debug"  -v /var/run/docker.sock:/var/run/docker.sock
#      -v /host/scripts/location:/usr/app/scripts -v /host/logs/location:/usr/app/logs 
#      <repo>/spdz-client-proxy:vx.y.z

LABEL name="SPDZ Proxy server." \
  description="SPDZ Proxy provides an HTTP REST API and Websocket API to communicate with a SPDZ Engine." \
  maintainer="bristolcrypto" \
  license="University of Bristol : Open Access Software Licence" 

# Install Docker cli static binary
RUN version="17.09.0" \
  && curl -SLO https://download.docker.com/linux/static/stable/x86_64/docker-$version-ce.tgz \
  && tar xvf docker-$version-ce.tgz \
  &&  mv docker/docker /usr/local/bin \
  && rm docker-$version-ce.tgz \
  && rm -fr docker

ENV NODE_ENV production
ENV LOG_LEVEL info
ENV SPDZ_HOST localhost
ENV SPDZ_PORT 14000
ENV SERVER_PORT 8080
ENV INTERFACE rest
ENV PLAYER_ID 0
ENV START_SCRIPT /usr/app/scripts/startSpdz.sh
ENV STOP_SCRIPT /usr/app/scripts/stopSpdz.sh

# Create app directory
RUN mkdir -p /usr/app
WORKDIR /usr/app

# Install app dependencies
COPY package.json /usr/app
RUN npm install --production

# Bundle app source
RUN mkdir -p /usr/app/src
COPY src /usr/app/src/

EXPOSE 8080

# Logs are mapped to host to be kept
VOLUME /usr/app/logs
# Location of startSpdz.sh and stopSpdz.sh scripts
VOLUME /usr/app/scripts

CMD exec node src/index.js 2>&1 | tee /usr/app/logs/spdzproxy_$SPDZ_PORT.log
