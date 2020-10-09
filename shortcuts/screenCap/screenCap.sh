#!/bin/bash
now=$(date)
scrot -s /home/pi/Desktop/screenCap/captures/"$now".jpg
node sendImage.js "$now"
