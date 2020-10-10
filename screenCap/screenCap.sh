#!/bin/bash
now=$(date +"%R")
window=$(xdotool getwindowfocus getwindowname)
name="$now-$window"
scrot -u /home/pi/Desktop/screenCap/captures/"$name".jpg
node /home/pi/Desktop/screenCap/sendImage.js "$name"