#!/bin/bash
source env/bin/activate
cd react-app
npm install
npm run build
cd ..
cd flask-server
python -i server.py
