#!/bin/bash

cd /htdocs/jetcalc
git pull
grunt
node admin.js compile
pm2 restart start.json