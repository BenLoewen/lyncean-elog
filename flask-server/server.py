from flask import Flask
from flask import render_template
from flask import Response, request, jsonify, flash, url_for, session, send_from_directory, send_file
import sqlite3
from datetime import datetime, timedelta
import time
import requests
import shutil
import urllib
import os
import base64
import logging
from collections import defaultdict
app = Flask(__name__)

cursor = None
db = None
curr_log = None
curr_entryId = 0
curr_logId = 0
curr_appendedId = 1

logIds = {}
tags = defaultdict(list)

INSTALLATION_LOCATION, database_path, CONFIG_FOLDER, COMMON_FOLDER, SCREENCAP_FOLDER, TAG_FILE = None, None, None, None, None, None

screenCapFiles = []
screenCapFilesInd = 0

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)


def get_folders():
  global INSTALLATION_LOCATION, database_path, CONFIG_FOLDER, COMMON_FOLDER, SCREENCAP_FOLDER, TAG_FILE
  cwd = os.getcwd()
  INSTALLATION_LOCATION = os.path.dirname(cwd)
  database_path = INSTALLATION_LOCATION + '/flask-server/data/elog'
  CONFIG_FOLDER = INSTALLATION_LOCATION + "/config/configs.txt"
  TAG_FILE = INSTALLATION_LOCATION + "/config/tags.txt"
  COMMON_FOLDER = INSTALLATION_LOCATION + "/common/"
  SCREENCAP_FOLDER = INSTALLATION_LOCATION + "/shortcuts/screenCap/captures/"

def get_tags():
  global logIds, tags
  f = open(TAG_FILE, 'r')
  lines = f.readlines()
  all_logs = []
  for line in lines:
    if line.startswith("#"):
      log_name = line.strip().lower()[1:]
      all_logs.append(log_name)
      logIds[log_name] = len(all_logs)
    else:
      tag_name = line.strip()
      if len(tag_name)>0:
        curr_log = all_logs[-1]
        tags[curr_log].append(tag_name)
  for log in tags:
    tags[log].insert(0,"None")


#All database functions
#createDatabase
#openDatabase
#closeDatabase
#setUpDatabase

def createDatabase():
  global logIds
  global cursor
  global db
  openDatabase()
  print("setting up the database...")
  cursor.execute('''
    CREATE TABLE log(id INTEGER PRIMARY KEY, title TEXT, logtype TEXT,
                      date TEXT, header INTEGER)
  ''')
  print("created table: log")
  cursor.execute('''
    CREATE TABLE entry(id INTEGER PRIMARY KEY, log INTEGER, author TEXT,
                       type TEXT, submitted TEXT)
  ''')
  print("Created table: entry")
  cursor.execute('''
    CREATE TABLE tag(entry INTEGER, tag TEXT)
  ''')
  print("created table: tag")
  cursor.execute('''
    CREATE TABLE image(name TEXT, base64 TEXT , entry INTEGER, appended INTEGER)
  ''')
  print("created table: image")
  cursor.execute('''
    CREATE TABLE file(name TEXT, data TEXT, entry INTEGER, appended INTEGER)
  ''')
  print("created table: file")
  cursor.execute('''
    CREATE TABLE comment(text INTEGER, entry INTEGER, appended INTEGER)
  ''')
  print("created table: comment")
  cursor.execute('''
    CREATE TABLE appended(id INTEGER PRIMARY KEY, time DATETIME, author TEXT)
  ''')
  print("created table: appended")
  cursor.execute('''
    CREATE TABLE test(operator TEXT, name TEXT, entry INTEGER, time DATETIME)
  ''')
  print("created table: test")
  cursor.execute('''
    CREATE TABLE part(name TEXT, pname TEXT, pconfig TEXT, unique(name,pname,pconfig))
  ''')
  print("created table: part")
  db.commit()
  print("all tables have been committed to the database")

  db.commit()
  print("...")

def openDatabase():
  global cursor
  global db
  print("opening database...")
  db = sqlite3.connect(':memory:')
  db = sqlite3.connect(database_path)
  cursor = db.cursor()
  print("database ready to use")
  print("...")

def getCursor():
  db = sqlite3.connect(':memory:')
  db = sqlite3.connect(database_path)
  cursor = db.cursor()
  return cursor,db

def closeDatabase():
  global db
  db.close()
  print("closed database.")

def setUpDatabase():
  global db
  db = sqlite3.connect(':memory:')
  db = sqlite3.connect(database_path)
  cursor = db.cursor()
  time.sleep(.300)
  openDatabase()
  fetchIds()

def commitDatabase():
  global db
  db.commit()
  print("changes committed")

def fetchIds():
  fetchEntryId()
  fetchAppendedId()
  fetchLogId()

def fetchLogId():
  cursor,db = getCursor()
  global curr_logId
  select = "SELECT MAX(id) FROM log;"
  for row in cursor.execute(select):
    max_id = row[0]
    if max_id is None:
      curr_logId = 0
    else:
      curr_logId = int(max_id) + 1

#entry(id INTEGER PRIMARY KEY, log INTEGER, author TEXT, type TEXT, submitted TEXT)
def deleteTodaysLogs():
  cursor,db = getCursor()
  now = datetime.now()
  date = now.strftime("%Y/%m/%d")
  start = now.strftime("%Y/%m/%d, 00:00:00")
  end = now.strftime("%Y/%m/%d, 23:59:59")
  delete_test = "DELETE FROM test WHERE time>'" + start + "' AND time<'" + end + "';"
  delete_entries = "DELETE FROM entry WHERE submitted>'" + start + "' AND submitted<'" + end + "';"
  delete_log = "DELETE FROM log WHERE date='" + date + "';"
  delete_comments = "DELETE FROM comment WHERE entry IN (SELECT id FROM entry WHERE submitted>'" + start + "' AND submitted<'" + end + "');"
  delete_images = "DELETE FROM image WHERE entry IN (SELECT id FROM entry WHERE submitted>'" + start + "' AND submitted<'" + end + "');"
  delete_tags = "DELETE FROM tag WHERE entry IN (SELECT id FROM entry WHERE submitted>'" + start + "' AND submitted<'" + end + "');"
  cursor.execute(delete_comments)
  cursor.execute(delete_images)
  cursor.execute(delete_tags)
  cursor.execute(delete_test)
  cursor.execute(delete_entries)
  cursor.execute(delete_log)
  db.commit()

def fetchAppendedId():
  cursor,db = getCursor()
  global curr_appendedId
  select = "SELECT MAX(id) FROM appended;"
  for row in cursor.execute(select):
    max_id = row[0]
    if max_id is None:
      curr_appendedId = 1
    else:
      curr_appendedId = int(max_id) + 1

def fetchEntryId():
  cursor,db = getCursor()
  global curr_entryId
  select = "SELECT MAX(id) FROM entry;"
  for row in cursor.execute(select):
    max_id = row[0]
    if max_id is None:
      curr_entryId = 0
    else:
      curr_entryId = int(max_id) + 1

def printLogs():
  cursor,db = getCursor()
  for row in cursor.execute('select date from log;'):
    print(row[0])

def headerExists(log):
  cursor,db = getCursor()
  now = datetime.now()
  date_time = now.strftime("%Y/%m/%d")
  select = 'SELECT MAX(date) FROM log WHERE logtype =?;'
  for row in cursor.execute(select,[log]):
    if row[0] == date_time:
      return True
    else:
      return False
  return False

def addEntry(author,log):
  cursor,db = getCursor()
  global curr_log
  curr_log = log
  global curr_entryId
  global logIds
  #Get ID of entry
  fetchEntryId()
  entryId = str(curr_entryId)
  now = datetime.now()
  date_time = now.strftime("%Y/%m/%d, %H:%M:%S")
  logId = now.strftime("%Y%m%d") + str(logIds[log])
  #Insert entry into database
  insert = '''
          INSERT INTO ENTRY (SUBMITTED,AUTHOR,LOG,ID,TYPE)
          VALUES (?, ?, ?, ?, ?);
          '''
  data_tuple = (date_time, author, int(logId), int(entryId), log)
  cursor.execute(insert, data_tuple)
  db.commit()
  return entryId,logId

def createLog(log):
  #log log(id INTEGER PRIMARY KEY, title TEXT, logtype TEXT,date TEXT, header INTEGER)
  global logIds
  cursor,db = getCursor()
  now = datetime.now()
  date = now.strftime("%Y/%m/%d")
  date_id = now.strftime("%Y%m%d")
  print("creating log for today")
  logName = log.capitalize()
  id_ = date_id + str(logIds[log])
  insert = '''
        INSERT INTO LOG (TITLE,ID,LOGTYPE,DATE,HEADER)
        VALUES (?, ?, ?, ?, NULL);
        '''
  data_tuple = (logName + " Log " + date, int(id_), log, date)
  cursor.execute(insert, data_tuple)
  db.commit()

def addTestConfiguration(log,operator,name,pnames,pconfigs):
  cursor,db = getCursor()
  createLog(log)
  entryId,logId = addEntry(operator,log)
  addTest(operator,name,entryId)
  try:
    for i in range(len(pnames)):
      addPart(name,pnames[i],pconfigs[i])
  except Exception:
    pass
  insert = '''
          UPDATE LOG
          SET header=?
          WHERE id=?;
          '''
  cursor.execute(insert,(entryId,logId))
  db.commit()
  print("updated header with test configuration")


def addTest(operator,name,entry):
  cursor,db = getCursor()
  insert = '''
          INSERT INTO TEST (OPERATOR,NAME,ENTRY,TIME)
          VALUES (?, ?, ?, ?);
          '''
  now = datetime.now()
  date_time = now.strftime("%Y/%m/%d, %H:%M:%S")
  data_tuple = (operator, name, entry,date_time)
  cursor.execute(insert, data_tuple)
  db.commit()
  print("inserted configuration into test table")

def addPart(name,pname,pconfig):
  cursor,db = getCursor()
  insert = '''
          INSERT INTO PART (NAME,PNAME,PCONFIG)
          VALUES (?, ?, ?);
          '''
  data_tuple = (name,pname,pconfig)
  cursor.execute(insert, data_tuple)
  db.commit()
  print("inserted part configuration")

def addLogPost(log, author, comment, files, images, tags):
  entryId,logId = addEntry(author,log)
  #Add post data to databse
  appendedId = 0
  addComment(comment,entryId,appendedId)
  for f in files:
    addFile(f,log,entryId,appendedId)
  for i in images:
    addImage(i,log,entryId,appendedId)
  for tag in tags:
    addTag(tag,entryId)

def appendToLogPost(logId, entryId, author, comment, files, images):
  appendedId = addAppendedStamp(author)
  log = getLogType(logId)
  addComment(comment,entryId,appendedId)
  for f in files:
    addFile(f,log,entryId,appendedId)
  for i in images:
    addImage(i,log,entryId,appendedId)

def getLogType(logId):
  cursor,db = getCursor()
  select = 'SELECT logtype FROM log WHERE id=' + str(logId) +';'
  for row in cursor.execute(select):
    return row[0]
  return None


def addAppendedStamp(author):
  cursor,db = getCursor()
  global curr_appendedId
  now = datetime.now()
  date_time = now.strftime("%Y/%m/%d, %H:%M:%S")
  appendedId = curr_appendedId
  curr_appendedId +=1
  insert = '''
          INSERT INTO APPENDED (ID,TIME,AUTHOR)
          VALUES (?, ?, ?);
          '''
  data_tuple = (appendedId, date_time, author)
  cursor.execute(insert, data_tuple)
  db.commit()
  print("inserted appended stamp")
  return appendedId

def addFile(f,log,entryId,appendedId):
  cursor,db = getCursor()
  saveFile(f,log)
  data = f[1]
  name = f[0]
  insert = '''
          INSERT INTO FILE (NAME,DATA,ENTRY,APPENDED)
          VALUES (?, ?, ?, ?);
          '''
  data_tuple = (name,data,entryId,appendedId)
  cursor.execute(insert, data_tuple)
  db.commit()
  print("inserted new file into file table")

def saveFile(file,log):
  name = file[0]
  data = file[1]
  now = datetime.now()
  date = now.strftime("/%Y/%m/%d/").split("/")
  directory = COMMON_FOLDER
  for part in date:
    directory += part + "/"
    if not os.path.isdir(directory):
        os.mkdir(directory)
  path = directory + name
  newFile = open(path, 'w')
  newFile.write(data)
  newFile.close()

def addImage(img,log,entryId,appendedId):
  name = img[0]
  data = img[1]
  global curr_log
  cursor,db = getCursor()
  now = datetime.now()
  date = now.strftime("/%Y/%m/%d/")
  log = curr_log
  insert = '''
          INSERT INTO IMAGE (NAME,BASE64,ENTRY,APPENDED)
          VALUES (?, ?, ?, ?);
          '''
  data_tuple = (name,data,entryId,appendedId)
  cursor.execute(insert, data_tuple)
  db.commit()
  print("inserted new image into image table")


def addComment(text,entryId,appendedId):
  cursor,db = getCursor()
  insert = '''
          INSERT INTO COMMENT (TEXT,ENTRY,APPENDED)
          VALUES (?, ?, ?);
          '''
  data_tuple = (text,entryId,appendedId)
  cursor.execute(insert, data_tuple)
  db.commit()
  print("inserted new comment into comment table")

def addTag(tag,entryId):
  cursor,db = getCursor()
  #tag(entry INTEGER, tag TEXT)
  insert = '''
          INSERT INTO tag (ENTRY,TAG)
          VALUES (?, ?);
          '''
  data_tuple = (entryId,tag)
  cursor.execute(insert, data_tuple)
  db.commit()
  print("inserted new tag into tag table")

def getLogData(logId):
  cursor,db = getCursor()
  entryId = None
  log_info = {"configname":"No Configuration Entered"}
  for row in cursor.execute('SELECT * FROM LOG WHERE ID=?;',[logId]):
    entryId = row[4]
    log_info["title"] = row[1]
  if entryId is None:
    print("error getting log data. seems the log being received does not exist")
  for row in cursor.execute('SELECT * FROM test WHERE entry=?;',[entryId]):
    log_info["operator"] = row[0]
    log_info["configname"] = row[1]
    log_info["timestart"] = row[3]
  for row in cursor.execute('SELECT MAX(submitted) FROM entry WHERE log=?;', [logId]):
    log_info["timestop"] = row[0]
  log_info["comps"] = []
  log_info["specs"] = []
  for row in cursor.execute('SELECT pname,pconfig FROM part WHERE name=?;', [log_info["configname"]]):
    log_info["comps"].append(row[0])
    log_info["specs"].append(row[1])
  return log_info

def getEntries(logId):
  cursor,db = getCursor()
  entries = []
  #entry = (files,comments,tags)
  #appended(id, time, author)
  #comment(text, entry, appended)
  for row in cursor.execute('SELECT * FROM entry WHERE log=? ORDER BY submitted;',[int(logId)]):
    entry = {}
    entry["id"] = row[0]
    entry["author"] = row[2]
    entry["time"] = row[4]
    entry["files"] = []
    entry["images"] = []
    entries.append(entry)
  for entry in entries:
    entryId = entry["id"]
    for row in cursor.execute('SELECT name,data FROM file WHERE entry=?;',[entryId]):
      entry["files"].append([row[0],row[1]])
    for row in cursor.execute('SELECT name,base64 FROM image WHERE entry=?;',[entryId]):
      entry["images"].append([row[0],row[1]])
    entry["comments"] = []
    appendedComments = []
    for row in cursor.execute('SELECT text,appended FROM comment WHERE entry=?;',[entryId]):
      text = row[0]
      appendedId = row[1]
      if appendedId==0:
        entry["comments"].append([text,""])
      else:
        appendedComments.append([text,appendedId])
    for appendedComment in appendedComments:
      text = appendedComment[0]
      appendedId = appendedComment[1]
      for row in cursor.execute('SELECT time,author FROM appended WHERE id='+str(appendedId)+';'):
        time = row[0]
        author = row[1]
        entry["comments"].append([text,"-Appended on " + time + " by " + author ])
    entry["tags"] = []
    for row in cursor.execute('SELECT tag FROM tag WHERE entry=?;',[entryId]):
      entry["tags"].append(row[0])
  return entries

def getEntriesFromIds(listOfIds):
  cursor,db=getCursor()
  entries = []
  for entryId in listOfIds:
    for row in cursor.execute('SELECT * FROM entry WHERE id=?;',[entryId]):
      entry = {}
      entry["id"] = row[0]
      entry["author"] = row[2]
      entry["logId"] = row[1]
      entry["time"] = row[4]
      entry["files"] = []
      entry["images"] = []
      entries.append(entry)
  for entry in entries:
    entryId = entry["id"]
    for row in cursor.execute('SELECT name,data FROM file WHERE entry=?;',[entryId]):
      entry["files"].append([row[0],row[1]])
    for row in cursor.execute('SELECT name,base64 FROM image WHERE entry=?;',[entryId]):
      entry["images"].append([row[0],row[1]])
    entry["comments"] = []
    appendedComments = []
    for row in cursor.execute('SELECT text,appended FROM comment WHERE entry=?;',[entryId]):
      text = row[0]
      appendedId = row[1]
      if appendedId==0:
        entry["comments"].append([text,""])
      else:
        appendedComments.append([text,appendedId])
    for appendedComment in appendedComments:
      text = appendedComment[0]
      appendedId = appendedComment[1]
      for row in cursor.execute('SELECT time,author FROM appended WHERE id='+str(appendedId)+';'):
        time = row[0]
        author = row[1]
        entry["comments"].append([text,"-Appended on " + time + " by " + author ])
    entry["tags"] = []
    for row in cursor.execute('SELECT tag FROM tag WHERE entry=?;',[entryId]):
      entry["tags"].append(row[0])
  return entries



def getDates():
  cursor,db=getCursor()
  dates = {}
  select = 'SELECT id FROM log;'
  ids = []
  for row in cursor.execute(select):
    ids.append(row[0])
  #Extract dates
  for id_ in ids:
    str_id = str(id_)
    #First part of id is YYYYMMDD, so grab first 8 characters
    year,month,day = str_id[:4],str_id[4:6],str_id[6:8]
    addToListDict(dates,"Start","Start/" + year)
    addToListDict(dates,"Start/" + year,"Start/" + year + "/" + month )
    addToListDict(dates, "Start/" + year + "/" + month, "Start/" + year + "/" + month + "/" + day)
  return dates

def addToListDict(dict_,key,val):
  if key not in dict_:
    dict_[key] = [val]
  elif val not in dict_[key]:
    dict_[key].append(val)



def searchLogs(configName, log):
  cursor,db=getCursor()
  query = configName.lower().replace(" ","%")
  if not query:
    query = "%"
  print(query)
  returnIds = []
  entryIds = []
  for row in cursor.execute('SELECT entry FROM test WHERE name LIKE ?',[query]):
    entryIds.append(row[0])
  print(entryIds)
  for entryId in entryIds:
    for row in cursor.execute('SELECT id,logtype FROM log WHERE header=?',[entryId]):
      if log=="all" or row[1]==log:
        returnIds.append(row[0])
  print(returnIds)
  return returnIds


def getLogsAtDate(date):
  cursor,db = getCursor()
  returnIds = []
  select = "SELECT id,date FROM LOG WHERE date='" + date + "';"
  for row in cursor.execute(select):
    returnIds.append(row[0])
  return returnIds


#entry(id INTEGER PRIMARY KEY, log INTEGER, author TEXT, type TEXT, submitted TEXT)
def searchEntries(startDate, endDate, log, tag, keyword):
  cursor,db=getCursor()
  candidateIds=[]
  startTime = startDate.replace("-","/") + ", 00:00:00"
  endTime = endDate.replace("-","/") + ", 24:00:00"
  search_keyword = keyword.lower().split(" ")
  select = 'SELECT id,log FROM entry WHERE submitted>=\'' + startTime + '\' AND submitted<=\'' + endTime + '\';'
  for row in cursor.execute(select):
    candidateIds.append([row[0],row[1]])
  nextRoundCandidates = []
  for candidate in candidateIds:
    if log!="all":
      for row in cursor.execute('SELECT logtype FROM log WHERE id=?;',[candidate[1]]):
        if(row[0]==log):
          nextRoundCandidates.append(candidate[0])
    else:
      nextRoundCandidates.append(candidate[0])
  candidateIds = nextRoundCandidates
  nextRoundCandidates = []
  for candidate in candidateIds:
    if tag!="all":
      for row in cursor.execute('SELECT tag FROM tag WHERE entry=?;',[candidate]):
        if(row[0]==tag):
          nextRoundCandidates.append(candidate)
    else:
      nextRoundCandidates.append(candidate)
  candidateIds = nextRoundCandidates
  nextRoundCandidates = []
  for candidate in candidateIds:
    passed = True
    if keyword!="":
      passed = False
      for row in cursor.execute('SELECT name FROM image WHERE entry=?',[candidate]):
        for term in search_keyword:
          if term in str(row[0]).lower():
            passed = True
      for row in cursor.execute('SELECT name FROM file WHERE entry=?',[candidate]):
        for term in search_keyword:
          if term in str(row[0]).lower():
            passed = True
      for row in cursor.execute('SELECT text FROM comment WHERE entry=?',[candidate]):
        for term in search_keyword:
          if term in str(row[0]).lower():
            passed = True
    if passed:
      nextRoundCandidates.append(candidate)
  return nextRoundCandidates


#All routes
@app.route('/fetch_tags', methods=['GET'])
def fetch_tags():
  global tags
  return jsonify(tags=dict(tags))

@app.route('/fetch_dates', methods=['GET'])
def fetch_dates():
  print("fetching dates of logs")
  print("...")

  dates = getDates()
  return jsonify(dates=dates)

@app.route('/logs_at_date', methods=['POST'])
def logs_at_date():
  query = request.get_json()
  date = query["date"][6:]

  print("received request to get logs at date " + date)

  res = getLogsAtDate(date)

  return jsonify(results=res)

@app.route('/search_logs', methods=['POST'])
def search_logs():
  query = request.get_json()

  print("received request for log search")
  print("...")

  log = query["log"]
  configName = query["config_name"]

  res = searchLogs(configName, log)

  return jsonify(results=res)

@app.route('/search_entries', methods=['POST'])
def search_entries():
  query = request.get_json()

  print("received request for entry search")
  print("...")

  log = query["log"]
  startDate = query["start_date"]
  endDate = query["end_date"]
  tag = query["tag"]
  keyword = query["keyword"]

  matching = searchEntries(startDate, endDate, log, tag, keyword)

  return jsonify(results=matching)


@app.route('/add_entry', methods=['POST'])
def add_entry():
  query = request.get_json()

  print("received request to add entry")
  print("...")

  print(query["log"])

  log = query["log"]
  author = query["author"]
  files = query["files"]
  images = query["images"]
  comment = query["comment"]
  tags = query["tag"]
  success = None

  addLogPost(log, author, comment, files, images, tags)
  print("succesfully added entry to " + log)
  print("...")
  success=True
  global screenCapFiles, screenCapFilesInd
  screenCapFiles = []
  screenCapFilesInd = 0

  return jsonify(successfullyWritten = success)

@app.route('/append_to_post', methods=['POST'])
def append_to_post():
  query = request.get_json()

  print("receieved request to append tio post")
  print("...")

  logId = query["logId"]
  entryId = query["entryId"]
  author = query["author"]
  comment = query["comment"]
  files = query["files"]
  images = query["images"]
  success = None

  appendToLogPost(logId, entryId, author, comment, files, images)
  print("succesfully appended to entry with id:" + str(entryId))
  print("...")
  success = True
  global screenCapFiles, screenCapFilesInd
  screenCapFiles = []
  screenCapFilesInd = 0

  return jsonify(successfullyWritten = success)

@app.route('/add_config', methods=['POST'])
def add_config():
  query = request.get_json()

  print("received request to add entry")
  print("...")

  log = query["log"]
  operator = query["operator"]
  name = query["name"]
  pnames = query["pnames"]
  pconfigs = query["pconfigs"]
  success = None

  try:
    addTestConfiguration(log,operator,name,pnames,pconfigs)
    print("succesfully added entry to " + log)
    print("...")
    success=True
  except:
    print("unsuccessful attempt to add entry to " + log)
    print("...")
    success=False


  return jsonify(successfullyWritten = success)

@app.route('/screen_cap', methods=['GET'])
def screen_cap():
  global screenCapFiles
  return jsonify(screenCapFiles = screenCapFiles)

@app.route('/upload_screen_cap/<name>', methods=['POST'])
def upload_screen_cap(name=None):
  global screenCapFiles
  name += '.jpg'
  screenCapFiles.append([name, screenCapToBase64(name)])
  return jsonify(success=True)

def screenCapToBase64(name):
  path = SCREENCAP_FOLDER + name
  with open(path, "rb") as image_file:
    b64_img = base64.standard_b64encode(image_file.read())
    return str(b64_img,"utf-8")

@app.route('/get_log/<id>', methods=['GET'])
def get_log(id=None):
  returnData = {}
  returnData = getLogData(id)

  return jsonify(data = returnData)

@app.route('/get_entries_from_ids', methods=['POST'])
def get_entries_from_ids():
  query = request.get_json()
  ids = query["ids"]

  entries = getEntriesFromIds(ids)
  return jsonify(entries = entries)

@app.route('/get_entries/<id>', methods=['GET'])
def get_entries(id=None):
  entries = getEntries(id)
  return jsonify(entries = entries)


@app.route('/header_exists', methods=['GET', 'POST'])
def header_exists():
  query = request.get_json()

  print("received request to know if header exists")
  print('...')
  doesExist = False

  #try:
  log = query['log']
  does = True
  curr_log = log
  #Check whether header exists
  doesExist = headerExists(log)
  #Get log id
  now = datetime.now()
  dateId = now.strftime("%Y%m%d")
  global logIds
  logId = dateId + str(logIds[log])

  return jsonify(exists = doesExist, logId = logId)

@app.route('/get_config/<name>', methods=['GET'])
def get_config(name=None):

  print("received request to get config with name " + name)
  print('...')

  try:
    name = name.replace('-', " ")
    config = getConfig(name)
  except:
    print("unsuccessful attempt to retrieve config with name " + name)
    print("...")


  return jsonify(config = config)

def getConfigFromDatabase(name):
  cursor,db = getCursor()
  configs = []
  select = "SELECT * FROM part WHERE name=?;"
  for row in cursor.execute(select,name):
    configs.append([row[1],row[2]])
  return configs

@app.route('/get_configs', methods=['GET'])
def get_configs():
  configs = {}

  print("received request to get configs")
  print('...')

  try:
    configs = getConfigNames()
  except:
    print("unsuccessful attempt to retrieve configs")
    print("...")

  return jsonify(configs = configs)


@app.route('/upload', methods=['POST'])
def fileUpload():
    global curr_log
    global screenCapFilesInd
    now = datetime.now()
    date = now.strftime("%Y/%m/%d/").split("/")
    file = request.files['file']
    filename = file.filename
    if(filename=='blob'):
      time = now.strftime('%H:%M:%S')
      filename = time + '_' + str(screenCapFilesInd)
      screenCapFilesInd += 1
    log = curr_log
    target = COMMON_FOLDER
    for part in date:
      target += part + "/"
      if not os.path.isdir(target):
          os.mkdir(target)
    destination="/".join([target, filename])
    file.save(destination)
    response = "success?"
    return response


def getConfigNames():
  names = []
  configs = getConfigsFromFile()
  for config in configs:
    names.append(config)
  return names

def getConfig(name):
  specs = []
  configs = getConfigsFromFile()
  return configs[name]

def getConfigsFromFile():
  f = open(CONFIG_FOLDER,'r')
  lines = f.readlines()
  configs = {}
  curr_config = None
  for line in lines:
    if line.startswith('#'):
      config_name = line[1:].strip()
      configs[config_name] = []
      curr_config = config_name
    else:
      if len(line)>1:
        split = line.index(":")
        part_name = line[0:split].lstrip()
        part_config = line[split+1:].rstrip()
        configs[curr_config].append([part_name,part_config])
  return configs




def getConfigsFromDatabase():
  cursor,db = getCursor()
  configs = {}
  select = "SELECT * FROM part;"
  for row in cursor.execute(select):
    #row = (name, pname, pconfig)
    if row[0] not in configs:
      configs[row[0]] = [[row[1],row[2]],]
    else:
      configs[row[0]].append([row[1],row[2]])
  #test(operator, name, entry)
  return configs


@app.route("/")
def my_index():
    return render_template("index.html")


if __name__ == '__main__':
  #name = "Thu_Dec_10_10_15_43_PST_2020.jpg"
  #screenCapFiles.append([name, screenCapToBase64(name)])
  get_folders()
  get_tags()
  if os.path.isfile(database_path):
    setUpDatabase()
  else:
    createDatabase()
  app.run(port=int("4040"), debug = True)
