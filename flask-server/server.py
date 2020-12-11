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
app = Flask(__name__)

INSTALLATION_LOCATION = "C:/Users/benja/Desktop/work/elog1.0/"

cursor = None
db = None
curr_log = None
curr_entryId = 0
curr_logId = 0
curr_appendedId = 1
logIds = {"electronics":1,"operations":2}
database_path = 'data/elog'
CONFIG_FOLDER = INSTALLATION_LOCATION + "config/configs.txt"
COMMON_FOLDER = INSTALLATION_LOCATION + "common/"
SCREENCAP_FOLDER = INSTALLATION_LOCATION + "shortcuts/screenCap/captures/"

screenCapFiles = []

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
                      committed TEXT, header INTEGER)
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
    CREATE TABLE part(name TEXT, pname TEXT, pconfig TEXT)
  ''')
  print("created table: part")
  cursor.execute('''
    CREATE TABLE commits(logtype TEXT, numcommits INTEGER)
  ''')
  print("created table: autocommit")
  cursor.execute('''
    CREATE TABLE autocommit(logtype TEXT, shouldcommit BOOLEAN)
  ''')
  print("created table: commits")
  db.commit()
  print("all tables have been committed to the database")

  for log in logIds:
    cursor.execute("INSERT INTO autocommit VALUES (?,1)", [log])
    cursor.execute("INSERT INTO commits VALUES (?,0)", [log])
  print("autocommits have been set to be on for all logs")
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
  cursor,db = getCursor()
  global curr_appendedId
  global curr_entryId
  global curr_logId
  select = "SELECT MAX(id) FROM log;"
  for row in cursor.execute(select):
    max_id = row[0]
    if max_id is None:
      curr_logId = 0
    else:
      curr_logId = int(max_id) + 1
  select = "SELECT MAX(id) FROM entry;"
  for row in cursor.execute(select):
    max_id = row[0]
    if max_id is None:
      curr_entryId = 0
    else:
      curr_entryId = int(max_id) + 1
  select = "SELECT MAX(id) FROM appended;"
  for row in cursor.execute(select):
    max_id = row[0]
    if max_id is None:
      curr_appendedId = 1
    else:
      curr_appendedId = int(max_id) + 1

def fetchLogs():
  cursor,db = getCursor()
  select = "SELECT * FROM log;"
  for row in cursor.execute(select):
    print(row)

def commitLog(log):
  cursor,db = getCursor()
  now = datetime.now()
  #Get ID of log
  logId = getOpenLogId(log)
  #Update number of commits on log
  numCommits = getNumCommits(log)
  #This prevents two ids from being the same, since end of id = logId + numCommitsForTheDay
  if(numCommits>=10):
    return False
  print(numCommits)
  update2 = "UPDATE commits SET numcommits=?;"
  cursor.execute(update2,[numCommits+1])
  #Commit old log
  date_time = now.strftime("%Y/%m/%d, %H:%M:%S")
  update = "UPDATE log SET committed=? WHERE id=?;"
  data_tuple = (date_time,logId)
  cursor.execute(update,data_tuple)
  #Create new log
  numCommits+=1
  date_id = now.strftime("%Y%m%d")
  date = now.strftime("%Y/%m/%d")
  id = date_id + str(logIds[log]) + str(numCommits)
  insert = '''
            INSERT INTO log (TITLE,ID,LOGTYPE,COMMITTED,HEADER)
            VALUES (?, ?, ?, NULL, NULL);
            '''
  data_tuple = (log.capitalize() + " Log " + date + " (" + str(numCommits) + ")", int(id),log)
  cursor.execute(insert, data_tuple)
  db.commit()
  return True

def changeAutoCommit(log,value):
  global db
  cursor,db = getCursor()
  update = "UPDATE autocommit SET shouldcommit=? WHERE logtype=?;"
  cursor.execute(update,[value,log])
  db.commit()
  print('Updated autocommit')

def getAutoCommit(log):
  global db
  cursor,db = getCursor()
  select = 'SELECT shouldcommit FROM autocommit WHERE logtype=?'
  for row in cursor.execute(select,[log]):
    return row[0]

def headerExists(logId):
  cursor,db = getCursor()
  select = 'SELECT header FROM log WHERE id =?;'
  print(logId)
  for row in cursor.execute(select,[logId]):
    if row[0] is None:
      return False
    else:
      return True
  print("Error! Checking if header exists for log with ID that does not exist!")
  return False

def getNumCommits(log):
  cursor,db = getCursor()
  select = 'SELECT numcommits FROM commits WHERE logtype =?;'
  for row in cursor.execute(select,[log]):
    return row[0]

def addEntry(author,log):
  cursor,db = getCursor()
  global curr_log
  curr_log = log
  global curr_entryId
  logId = getOpenLogId(log)
  #Get ID of entry
  fetchIds()
  curr_entryId+=1
  entryId = str(curr_entryId)
  now = datetime.now()
  date_time = now.strftime("%Y/%m/%d, %H:%M:%S")
  #Insert entry into database
  insert = '''
          INSERT INTO ENTRY (SUBMITTED,AUTHOR,LOG,ID,TYPE)
          VALUES (?, ?, ?, ?, ?);
          '''
  data_tuple = (date_time, author, int(logId), int(entryId), log)
  cursor.execute(insert, data_tuple)
  db.commit()
  print("inserted new entry into entry table")
  return entryId,logId

def getOpenLogId(log):
  #log log(id INTEGER PRIMARY KEY, title TEXT, logtype TEXT,committed TEXT, header INTEGER)
  cursor,db = getCursor()
  select = 'SELECT MAX(id) FROM log WHERE logtype="' + log + '";'
  for row in cursor.execute(select):
    return row[0]

def addTestConfiguration(log,operator,name,pnames,pconfigs):
  cursor,db = getCursor()
  entryId,logId = addEntry(operator,log)
  addTest(operator,name,entryId)
  for i in range(len(pnames)):
    addPart(name,pnames[i],pconfigs[i])
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
  print(appendedId)
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
  date = now.strftime("/%Y/%m/%d/")
  directory = COMMON_FOLDER + str(log) + date
  path = directory + name
  if not os.path.isdir(directory):
      os.mkdir(directory)
  newFile = open(path, 'w')
  newFile.write(data)
  newFile.close()

def addImage(img,log,entryId,appendedId):
  print("img:")
  print(img[0])
  print("data:")
  print(img[1])
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
  print(text)
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

def getRecentLogData():
  cursor,db = getCursor()
  ids = []
  end_date = datetime.today() + timedelta(days=1)
  start_date = datetime.today() - timedelta(days=7)
  start_id = start_date.strftime("%Y%m%d") + "00"
  end_id = end_date.strftime("%Y%m%d") + "00"
  for row in cursor.execute('SELECT id FROM log WHERE committed IS NULL AND header IS NOT NULL'):
    ids.append(row[0])
  for row in cursor.execute('SELECT id FROM log WHERE committed IS NOT NULL AND id>=? AND ?>=id ORDER BY committed;',(start_id,end_id)):
    ids.append(row[0])
  return ids

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
      print(appendedId)
      if appendedId==0:
        entry["comments"].append([text,""])
      else:
        appendedComments.append([text,appendedId])
    print(appendedComments)
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


def searchLogs(startDate, endDate, configName, log):
  cursor,db=getCursor()
  returnIds = []
  candidateIds = []
  startTime = startDate.replace("-","/") + ", 00:00:00"
  endTime = endDate.replace("-","/") + ", 00:00:00"
  select = 'SELECT id,header FROM log WHERE logtype=\'' + log+ '\' and committed>\'' + startTime + '\' and committed<\'' + endTime + '\';'
  if(log=="all"):
    select = 'SELECT id,header FROM log WHERE committed>\'' + startTime + '\' and committed<\'' + endTime + '\';'
  for row in cursor.execute(select):
    candidateIds.append([row[0],row[1]])
  for candidate in candidateIds:
    logId = candidate[0]
    headerId = candidate[1]
    if(configName==""):
      returnIds.append(logId)
    else:
      searchTermInName = False
      for row in cursor.execute('SELECT name FROM test WHERE entry=?',[headerId]):
        name = row[0].lower()
        searched_terms = configName.lower().split(" ")
        for searched_term in searched_terms:
          if searched_term in name:
            searchTermInName = True
      if searchTermInName:
        returnIds.append(logId)
  print(returnIds)
  return returnIds





#All routes
#add_entry: for adding new log entry
#add_config: for adding new test configuration
#get_log: get all entries and log data (from its id)
#header_exists: retruns whether a header exists for a log (from log type)
@app.route('/search_logs', methods=['POST'])
def search_logs():
  query = request.get_json()

  print("received request for log search")
  print("...")

  log = query["log"]
  startDate = query["start_date"]
  endDate = query["end_date"]
  configName = query["config_name"]

  res = searchLogs(startDate, endDate, configName, log)

  return jsonify(results=res)

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

  screenCapFiles = []

  '''
  try:
    addLogPost(log, author, files, comment,images,tags,isAppended)
    print("succesfully added entry to " + log)
    print("...")
    success=True
  except:
    print("unsuccessful attempt to add entry to " + log)
    print("...")
    success=False
  '''

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

  screenCapFiles = []

  '''
  try:
    appendToLogPost(logId, entryId, author, comment, files, images)
    print("succesfully appended to entry with id:" + str(entryId))
    print("...")
    success = True
  except:
    print("unsuccesful attempt to append to entry with id:" + str(entryId))
    success = False
  '''

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
  return jsonify(screenCapFiles = screenCapFiles)

@app.route('/upload_screen_cap/<name>', methods=['POST'])
def upload_screen_cap(name=None):
  name += '.jpg'
  screenCapFiles.append([name, screenCapToBase64(name)])
  return jsonfiy(success=True)

def screenCapToBase64(name):
  path = SCREENCAP_FOLDER + name
  with open(path, "rb") as image_file:
    b64_img = base64.standard_b64encode(image_file.read())
    return str(b64_img,"utf-8")

@app.route('/get_log/<id>', methods=['GET'])
def get_log(id=None):
  returnData = {}
  #try:
  returnData = getLogData(id)
  #except:
  #  print("Unsucessful attempt to retrieve log: " + str(id))

  return jsonify(data = returnData)

@app.route('/get_entries/<id>', methods=['GET'])
def get_entries(id=None):
  entries = getEntries(id)
  return jsonify(entries = entries)

@app.route('/get_recent', methods=['GET'])
def get_recent():
  ids = getRecentLogData()
  return jsonify(ids = ids)


@app.route('/set_autocommit', methods=['POST'])
def set_autocommit():
  query = request.get_json()

  log = query["log"]
  value = query["value"]

  succ = False

  try:
    changeAutoCommit(log,value)

    succ = True
  except:
    print("unsuccesful attempt to set autocommit")
    succ = False

  return jsonify(succ = succ)

@app.route('/get_autocommit/<log>', methods=['GET'])
def get_autocommit(log=None):
  value = 1
  try:
    value = getAutoCommit(log)
  except:
    print("unsuccessful attempt to get autocommit")

  return jsonify(value = value)

@app.route('/commit_log', methods=['POST'])
def commit_log():
  query = request.get_json()

  log = query["log"]

  try:
    succ = commitLog(log)
  except:
    print("unsuccessful attempt to commit log: " + log)
    succ = False

  return jsonify(succ = succ)


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
  logId = getOpenLogId(log)
  print("Log id: " + str(logId))
  #Check whether header exists
  doesExist = headerExists(logId)
  #except:
  #  print("unsuccessful attempt to check if header exists")

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
    now = datetime.now()
    date = now.strftime("/%Y/%m/%d/")
    file = request.files['file']
    filename = file.filename
    log = curr_log
    target = COMMON_FOLDER + str(log) + date
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


def runAutojobs():
  os.system("python autojobs.py")

if __name__ == '__main__':
  #name = "Thu_Dec_10_10_15_43_PST_2020.jpg"
  #screenCapFiles.append([name, screenCapToBase64(name)])
  if os.path.isfile(database_path):
    setUpDatabase()
  else:
    createDatabase()
  app.run(port=int("4040"), debug = True)
