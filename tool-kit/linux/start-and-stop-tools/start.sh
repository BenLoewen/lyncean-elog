#!/bin/bash
source env/bin/activate
cd react-app
npm run build
cd ../flask-server
python -i server.py