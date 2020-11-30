#!/bin/bash
set -e

>&2 echo "Checking working directory..." 
# git diff-index seems to remember files that changed.
# git status seems to clear that memory and force
# it to re-check
>/dev/null git status
>&2 git diff-index HEAD --exit-code
IS_CLEAN="$(echo $?)"

if [[ $IS_CLEAN != 0 ]]; then 
  >&2 echo "Working directory is not clean. Refusing to proceed!" 
  exit 1
fi
>&2 echo "Working directory is clean. Proceeding!" 
IS_FAILING="$(npx jest --ci --bail --useStderr; echo $?)"
if [[ $IS_FAILING != 0 ]]; then 
  >&2 echo "Working directory tests are failing. Refusing to proceed!" 
  exit 1
fi
>&2 echo "Working directory tests are passing. Proceeding!" 

TEST_PATHS=("test" "jest.conf.js")

OLD_TAG="$(git describe --tags "$(git rev-list --tags --max-count=1)")"
TEST_DIFFER="$(git diff-index --quiet "${OLD_TAG}" -- "${TEST_PATHS[@]}"; echo $?)"

if [[ $TEST_DIFFER == 0 ]]; then
  >&2 echo "We have the same tests as tag ${OLD_TAG}. Suggesting a patch bump!"
  echo 'patch'
  exit 0
fi

>&2 echo "Tests have changed since tag ${OLD_TAG}. Running old tests"

git checkout "${OLD_TAG}" -- "${TEST_PATHS[@]}"
TEST_STATUS="$(npx jest --ci --bail --useStderr; echo $?)"
OLD_VERSION=OLD_TAG
if [[ $TEST_STATUS != 0 ]]; then
  >&2 echo "We fail old tests! Suggesting a major bump."
  echo 'major'
elif [[ $TEST_DIFFER != 0 ]]; then
  >&2 echo "Old tests pass! Suggesting a minor bump."
  echo 'minor'
fi
git checkout -- ./
