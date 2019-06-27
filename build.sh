#!/bin/bash

yarn install

yarn test
yarn browserstack

yarn build
yarn corelibs