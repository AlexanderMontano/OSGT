#!/usr/bin/env bash

cd ..

rm -R ./public
mkdir public

cd client
npm run build
cd ..

cd infra
npm run deploy

npm run syncPublic