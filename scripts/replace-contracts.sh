#!/bin/sh
# replace-contracts.sh
cp -r ./zytron/safe-deployments/v1.3.0 ./node_modules/@safe-global/safe-deployments/dist/assets
cp -r ./zytron/protocol-kit/v1.3.0 ./node_modules/@safe-global/protocol-kit/node_modules/@safe-global/safe-deployments/dist/assets
cp -r ./zytron/api-kit/v1.3.0 ./node_modules/@safe-global/api-kit/node_modules/@safe-global/safe-deployments/dist/assets
