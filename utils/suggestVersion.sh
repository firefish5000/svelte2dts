#!/bin/bash
set -e
IS_PRE=""
for flag in "$@" ; do
    case "${flag}" in
        p|pre|prerelease) IS_PRE="1";;
    esac
done

IS_CLEAN="$(git diff-index --quiet HEAD; echo $?)"

if [[ $IS_CLEAN != 0 ]]; then 
  >&2 echo "Working directory is not clean. Refusing to proceed!" 
  exit 1
else
  OLD_TAG="$(git describe --tags "$(git rev-list --tags --max-count=1)")"
  TEST_DIFFER="$(git diff-index --quiet ${OLD_TAG} -- test jest.conf.js; echo $?)"
  if [[ $TEST_DIFFER != 0 ]]; then
    >&2 echo "Tests differ!"
  fi
  git checkout "${OLD_TAG}" -- test jest.config.js
  TEST_STATUS="$(npm test; echo $?)"
  OLD_VERSION=OLD_TAG
  if [[ $TEST_STATUS != 0 ]]; then
    >&2 echo "It does not work with old tests from tag ${OLD_TAG}! Suggesting a major bump!"
    npm version "${IS_PRE:+pre}"major
  elif [[ $TEST_DIFFER != 0 ]]; then
    >&2 echo "Tests have changed since tag ${OLD_TAG}! Suggesting a minor bump!"
    npm version "${IS_PRE:+pre}"minor
  else
    >&2 echo "We have the same tests as tag ${OLD_TAG}! Suggesting a patch bump!"
    npm version "${IS_PRE:+pre}"patch
  fi
  git checkout -- ./
fi