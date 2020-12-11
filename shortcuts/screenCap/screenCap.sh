#!/bin/bash
now=$(date)
name="${now// /_}"
scrot -s /home/bloewen/elog/lyncean-elog/shortcuts/screenCap/captures/"$name".jpg
node sendImage.js "$name"
