#!/bin/bash
now=$(date)
name="${now// /_}"
scrot -s /home/bloewen/elog/elog-test/shortcuts/screenCap/captures/"$name".jpg
node sendImage.js "$name"