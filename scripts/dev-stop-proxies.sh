#!/bin/bash

HERE=$(cd `dirname $0`; pwd)
PROXYROOT=$HERE/..

if [ -n "$(ls $PROXYROOT/logs/*.pid)" ]
then
  for f in $PROXYROOT/logs/*.pid
  do
    read pid <$f
    echo "Killing process $pid"
    kill $pid
    rm $f
  done
else
  echo "No processes to stop"
fi

