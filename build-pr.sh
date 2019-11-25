#!/bin/bash

yarn install

yarn test

yarn corelibs
yarn build

yarn wiki:check-updates
