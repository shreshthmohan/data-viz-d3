#!/bin/sh
rm -rf dist
mkdir dist
cp -r ./src/* ./dist/
rm -rf ./dist/scss ./dist/utils