from flask import Flask
from flask import render_template
from flask import Response, request, jsonify
import sqlite3
from datetime import datetime
import time
from urllib.request import urlopen
import os
app = Flask(__name__)

INSTALLATION_LOCATION = "/home/bloewen/elog/lyncean-elog/"

cursor = None
db = None
logIds = {"electronics":1, "operations": 2}


CONFIG_FOLDER = INSTALLATION_LOCATION + "config/configs.txt"
COMMON_FOLDER = INSTALLATION_LOCATION + "common/"


def openDatabase():
  global cursor
  global db
  db = sqlite3.connect(':memory:')
  db = sqlite3.connect(INSTALLATION_LOCATION + '/flask-server/data/elog')
  cursor = db.cursor()

def closeDatabase():
  global cursor
  global db
  db.close()


def autocommitLogs():
  global cursor
  global db
  global logIds
  autocommitLog = {}
  now = datetime.now()
  date_time = now.strftime("%Y/%m/%d, %H:%M:%S")
  for log in logIds:
    select = "SELECT shouldcommit FROM autocommit WHERE logtype =?"
    for row in cursor.execute(select, [log]):
      shouldCommit = row[0]
      autocommitLog[log] = shouldCommit
      if shouldCommit:
        update = "UPDATE log SET committed=? WHERE logtype=? AND committed IS NULL;"
        data_tuple = (date_time,log)
        cursor.execute(update,data_tuple)
  db.commit()
  return autocommitLog

def resetCommits():
  global cursor
  global db
  update = "UPDATE commits SET numcommits=0;"
  cursor.execute(update)
  db.commit()
  print("commits reset")

def deleteUnusedLogs():
  global cursor
  global db
  delete = '''
          DELETE FROM log
          WHERE header is NULL;
          '''
  cursor.execute(delete)
  db.commit()
  print("deleted unused logs")

def createDailyFolders():
  now = datetime.now()
  now2 = datetime.now
  date = now.strftime("%Y/%m/%d")
  date_parts = date.split('/')
  common = COMMON_FOLDER
  if not os.path.isdir(common):
    os.mkdir(common)
  for date_part in date_parts:
    common += '/' + date_part
    if not os.path.isdir(common):
      os.mkdir(common)

def createTodaysLogs():
  global cursor
  global db
  autocommitLog = autocommitLogs()
  now = datetime.now()
  date = now.strftime("%Y/%m/%d")
  date_id = now.strftime("%Y%m%d")
  print("creating logs for " + date + " ...")
  for log in logIds:
    logName = log.capitalize()
    if autocommitLog[log] == 1:
      id = date_id + str(logIds[log]) + str(0)
      insert = '''
            INSERT INTO LOG (TITLE,ID,LOGTYPE,COMMITTED,HEADER)
            VALUES (?, ?, ?, NULL, NULL);
            '''
      data_tuple = (logName + " Log " + date, int(id), log)
      cursor.execute(insert, data_tuple)
      print("started " + log + " log")
    else:
      print("skipping " + log + " log")
  db.commit()
  print("done creating logs")
  print('...')



if __name__ == '__main__':
  print("starting autojobs...")
  openDatabase()
  createDailyFolders()
  deleteUnusedLogs()
  createTodaysLogs()
  resetCommits()
  closeDatabase()
  print("autojobs completed.")
