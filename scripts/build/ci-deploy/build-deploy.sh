#!/bin/bash
set -eo pipefail

_version="1.2.6"
_tag="grafana/grafana-ci-deploy:${_version}"

docker build -t $_tag .
docker push $_tag
