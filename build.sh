#!/bin/bash

yarn install

yarn test

# we do not run browserstack if environment has $TRAVIS variable
# or if it is pull request from fork $TRAVIS_PULL_REQUEST_SLUG != $TRAVIS_REPO_SLUG
if [[ ! $TRAVIS || ($TRAVIS && ( $TRAVIS_PULL_REQUEST_SLUG == "$TRAVIS_REPO_SLUG" || $TRAVIS_PULL_REQUEST_SLUG == "" )) ]];
then
  yarn browserstack
fi

yarn corelibs
yarn build

yarn wiki:check-updates
