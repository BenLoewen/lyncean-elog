from flask import Flask
from flask import render_template
from flask import Response, request, jsonify
import sqlite3
from datetime import datetime
import time
from urllib.request import urlopen
app = Flask(__name__)

cursor = None
db = None
logIds = {"electronics":1}


def openDatabase():
  global cursor
  global db
  db = sqlite3.connect(':memory:')
  db = sqlite3.connect('data/elog')
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
        update = "UPDATE log SET committed=? WHERE logtype=? AND committed=NULL;"
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
  insert = '''
          DELETE FROM log
          WHERE ;
          '''

def createTodaysLogs():
  global cursor
  global db
  autocommitLog = autocommitLogs()
  now = datetime.now()
  date = now.strftime("%Y/%m/%d")
  date_id = now.strftime("%Y%m%d")
  print("creating logs for " + date + " ...")
  for log in logIds:
    if autocommitLog[log] == True:
      id = date_id + str(logIds[log]) + str(0)
      insert = '''
            INSERT INTO LOG (TITLE,ID,COMMITTED,HEADER)
            VALUES (?, ?, NULL, NULL);
            '''
      data_tuple = (log + " Log " + date, int(id))
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
  createTodaysLogs()
  resetCommits()
  closeDatabase()
  print("autojobs completed.")