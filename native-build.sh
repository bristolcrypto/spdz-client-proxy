#!/bin/bash
# Build a zip file for plain deploy. 
# Rebuilds node_modules for production.
# Prerequisite is npm. 
# Versioning from package.json.

PROJROOT=$(cd `dirname $0`; pwd)

echo "Building in $PROJROOT"

echo "============================================="
echo "Install node_modules for production only ...."
echo "============================================="
if test -d $PROJROOT/node_modules; then
    rm -fr $PROJROOT/node_modules
fi

cd $PROJROOT

npm install --production 

echo "====================================="
echo "Zip src node_modules package.json...."
echo "====================================="

PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

if test -f spdzproxy_v$PACKAGE_VERSION.zip; then
    rm spdzproxy_v$PACKAGE_VERSION.zip
fi

zip -r spdzproxy_v$PACKAGE_VERSION.zip package.json src/ node_modules/
