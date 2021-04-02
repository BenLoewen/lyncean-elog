#!/bin/bash
now=$(date)
name="${now// /_}"
scrot -u /home/bloewen/elog/lyncean-elog/shortcuts/screenCap/captures/"$name".jpg
python /home/bloewen/elog/lyncean-elog/shortcuts/newswriter/newswriter2.py "$name"