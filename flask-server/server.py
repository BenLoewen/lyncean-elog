from flask import Flask
from flask import render_template
from flask import Response, request, jsonify
import sqlite3
from datetime import datetime, timedelta
import time
from urllib.request import urlopen
import os
app = Flask(__name__)


cursor = None
db = None
curr_entryId = 0
curr_appendedId = 0
logIds = {"electronics":1}
database_path = 'data/elog'

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
    CREATE TABLE file(path TEXT, entry INTEGER, appended INTEGER)
  ''')
  print("created table: file")
  cursor.execute('''
    CREATE TABLE image(url INTEGER, entry INTEGER, appended INTEGER)
  ''')
  print("created table: image")
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

def closeDatabase():
  global cursor
  global db
  commitDatabase()
  db.close()
  print("closed database.")

def setUpDatabase():
  global cursor
  time.sleep(.300)
  openDatabase()
  fetchIds()

def commitDatabase():
  global db
  db.commit()
  print("changes committed")

def fetchIds():
  global cursor
  global curr_appendedId
  global curr_entryId
  select = "SELECT MAX(id) FROM log;"
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
      curr_entryId = 0
    else:
      curr_entryId = int(max_id) + 1

def commitLog(id,log):
  global cursor
  now = datetime.now()
  #Commit old log
  date_time = now.strftime("%Y/%m/%d, %H:%M:%S")
  update = "UPDATE log SET committed=? WHERE id=?;"
  data_tuple = (date_time,id)
  cursor.execute(update,data_tuple)
  numCommits = getNumCommits(log)
  update2 = "UPDATE commits SET numcommits=?;"
  cursor.execute(update2,[numCommits+1])
  #Create new log
  numCommits+=1
  date_id = now.strftime("%Y%m%d")
  date = now.strftime("%Y/%m/%d")
  id = date_id + str(logIds[log]) + str(numCommits)
  insert = '''
            INSERT INTO log (TITLE,ID,LOGTYPE,COMMITTED,HEADER)
            VALUES (?, ?, ?, NULL, NULL);
            '''
  data_tuple = (log + " Log " + date + "(" + str(numCommits) + ")", int(id),log)
  cursor.execute(insert, data_tuple)
  commitDatabase()

def changeAutoCommit(log,value):
  global cursor
  update = "UPDATE autocommit SET shouldcommit=? WHERE logtype=?;"
  cursor.execute(update,[value,log])
  commitDatabase()

def getAutoCommit(log):
  global cursor
  select = "SELECT shouldcommit FROM autocommit WHERE logtype=?"
  for row in cursor.execute(select,[log]):
    return row[0]

def headerExists(logId):
  global cursor
  select = "SELECT header FROM log WHERE id =?;"
  for row in cursor.execute(select,[logId]):
    print(row[0])
    return row[0]=='NULL'
  print("Error! Checking if header exists for log with ID that does not exist!")
  return False

def getNumCommits(log):
  select = "SELECT numcommits FROM commits WHERE logtype =?;"
  for row in cursor.execute(select,[log]):
    return row[0]

def addEntry(author,log):
  global cursor
  global curr_entryId
  global db
  #Get time
  now = datetime.now()
  date_time = now.strftime("%Y/%m/%d, %H:%M:%S")
  #Get ID of log
  numcommits = getNumCommits(log)
  logId = now.strftime("%Y%m%d") + str(logIds[log]) + str(numcommits)
  #Get ID of entry
  entryId = now.strftime("%Y%m%d") + str(curr_entryId)
  curr_entryId+=1
  #Insert entry into database
  insert = '''
          INSERT INTO ENTRY (SUBMITTED,AUTHOR,LOG,ID,TYPE)
          VALUES (?, ?, ?, ?, ?);
          '''
  data_tuple = (date_time, author, int(logId), int(entryId), log)
  cursor.execute(insert, data_tuple)
  print("inserted new entry into entry table")
  return entryId,logId

def addTestConfiguration(log,operator,name,pnames,pconfigs):
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
  commitDatabase()
  print("updated header with test configuration")


def addTest(operator,name,entry):
  global cursor
  insert = '''
          INSERT INTO TEST (OPERATOR,NAME,ENTRY,TIME)
          VALUES (?, ?, ?, ?);
          '''
  now = datetime.now()
  date_time = now.strftime("%Y/%m/%d, %H:%M:%S")
  data_tuple = (operator, name, entry,date_time)
  cursor.execute(insert, data_tuple)
  print("inserted configuration into test table")

def addPart(name,pname,pconfig):
  global cursor
  insert = '''
          INSERT INTO PART (NAME,PNAME,PCONFIG)
          VALUES (?, ?, ?);
          '''
  data_tuple = (name,pname,pconfig)
  cursor.execute(insert, data_tuple)
  print("inserted part configuration")

def addLogPost(log, author, comment, files, images, tags, isAppended):
  global db
  entryId,logId = addEntry(author,log)
  #Add post data to databse
  appendedId = 0
  if isAppended:
    appendedId=addAppendedStamp(author)
  addComment(comment,entryId,appendedId)
  for f in files:
    addFile(f,log,entryId,appendedId)
  for img in images:
    addImage(img,log,entryId,appendedId)
  for tag in tags:
    addTag(tag,entryId)
  commitDatabase()

def addAppendedStamp(author):
  global cursor
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
  print("inserted appended stamp")

def addFile(f,log,entryId,appendedId):
  global cursor
  #path = saveFile(f,log)
  path = f
  insert = '''
          INSERT INTO FILE (PATH,ENTRY,APPENDED)
          VALUES (?, ?, ?);
          '''
  data_tuple = (path,entryId,appendedId)
  cursor.execute(insert, data_tuple)
  print("inserted new file into file table")

def saveFile(f,log):
  name = f[0]
  url = f[1]
  with open(url,"rb") as f:
    image_blob = f.read()
  now = datetime.now()
  date = now.strftime("/%Y/%m/%d/")
  directory = "/common/" + str(log) + date
  path = directory + name
  newFile = open(path, "wb")
  newFile.write(data)
  newFile.close()
  return paths

def addImage(img,log,entryId,appendedId):
  global cursor
  path = saveFile(img,log)
  insert = '''
          INSERT INTO IMAGE (URL,ENTRY,APPENDED)
          VALUES (?, ?, ?);
          '''
  data_tuple = (path,entryId,appendedId)
  cursor.execute(insert, data_tuple)
  print("inserted new image into image table")

def addComment(text,entryId,appendedId):
  global cursor
  insert = '''
          INSERT INTO COMMENT (TEXT,ENTRY,APPENDED)
          VALUES (?, ?, ?);
          '''
  data_tuple = (text,entryId,appendedId)
  cursor.execute(insert, data_tuple)
  print("inserted new comment into comment table")

def addTag(tag,entryId):
  global cursor
  #tag(entry INTEGER, tag TEXT)
  insert = '''
          INSERT INTO tag (ENTRY,TAG)
          VALUES (?, ?);
          '''
  data_tuple = (text,entryId)
  cursor.execute(insert, data_tuple)
  print("inserted new tag into tag table")

def getRecentLogData():
  global cursor
  ids = []

  end_date = datetime.today() + timedelta(days=1)
  start_date = datetime.today() - timedelta(days=7)
  start_id = start_date.strftime("%Y%m%d") + "00"
  end_id = end_date.strftime("%Y%m%d") + "00"

  for row in cursor.execute('SELECT id FROM log WHERE committed IS NULL AND header IS NOT NULL'):
    ids.append(row[0])

  print(start_id)
  print(end_id)

  for row in cursor.execute('SELECT id FROM log WHERE committed IS NOT NULL AND id>=? AND ?>=id;',(start_id,end_id)):
    ids.append(row[0])

  return ids

def getLogData(logId):
  global cursor
  entryId = None
  log_info = {}
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
  global cursor
  entries = []
  #entry = (files,comments,tags)
  for row in cursor.execute('SELECT * FROM entry WHERE log=? ORDER By submitted;',[logId]):
    entry = {}
    id = row[0]
    entry["author"] = row[2]
    entry["time"] = row[4]
    entry["files"] = []
    for row in cursor.execute('SELECT path FROM file WHERE entry=?;',[id]):
      entry["files"].append(row[0])
    entry["comments"] = []
    for row in cursor.execute('SELECT text FROM comment WHERE entry=?;',[id]):
      entry["comments"].append(row[0])
    entry["tags"] = []
    for row in cursor.execute('SELECT tag FROM tag WHERE entry=?;',[id]):
      entry["tags"].append(row[0])

    entries.append(entry)
  return entries

#All routes
#add_entry: for adding new log entry
#add_config: for adding new test configuration
#get_log: get all entries and log data (from its id)
#header_exists: retruns whether a header exists for a log (from log type)

@app.route('/add_entry', methods=['POST'])
def add_entry():
  json_data = request.get_json()
  query = json_data["query"]

  print("received request to add entry")
  print("...")

  log = query["log"]
  author = query["author"]
  files = query["files"]
  comment = query["comment"]
  images = query["images"]
  tags = query["tag"]
  isAppended = query["isAppended"]
  success = None

  try:
    addLogPost(log, author, files, comment,images,tags,isAppended)
    print("succesfully added entry to " + log)
    print("...")
    success=True
  except:
    print("unsuccessful attempt to add entry to " + log)
    print("...")
    success=False

  return jsonify(successfullyWritten = success)


@app.route('/add_config', methods=['POST'])
def add_config():
  json_data = request.get_json()
  query = json_data["query"]

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

@app.route('/get_log', methods=['GET'])
def get_log():
  json_data = request.get_json()
  query = json_data["query"]

  id = query["id"]

  try:
    returnData = getLogData(id)
  except:
    print("Unsucessful attempt to retrieve log: " + str(id))

  return jsonify(returnData = returnData)

@app.route('/get_entries', methods=['GET'])
def get_entries():
  json_data = request.get_json()
  query = json_data["query"]

  id = query["id"]
  entries = getEntries()

  return jsonify(entries = entries)

@app.route('/get_recent', methods=['GET'])
def get_recent():
  ids = getRecentLogData()
  return jsonify(ids = ids)

@app.route('/set_autocommit', methods=['POST'])
def set_autocommit():
  json_data = request.get_json()
  query = json_data["query"]

  log = query["log"]
  value = query["value"]

  try:
    changeAutoCommit(log,value)
    succ = True
  except:
    print("unsuccesful attempt to set autocommit")
    succ = False

  return jsonify(succ = succ)

@app.route('/get_autocommit', methods=['GET'])
def get_autocommit():
  json_data = request.get_json()
  query = json_data["query"]

  log = query["log"]

  value = 1

  try:
    value = getAutoCommit(log)
  except:
    print("unsuccessful attempt to get autocommit")

  return jsonify(value = value)

@app.route('/commit_log', methods=['POST'])
def commit_log():
  json_data = request.get_json()
  query = json_data["query"]

  log = query["log"]
  id = query["id"]

  try:
    commitLog(id,log)
    succ = True
  except:
    print("unsuccessful attempt to get autocommit")
    succ = False

  return jsonify(succ = succ)


@app.route('/header_exists', methods=['GET', 'POST'])
def header_exists():
  json_data = request.get_json()
  query = json_data["query"]

  print("received request to know if header exists")
  print('...')

  try:
    log = query["log"]
    does = True
    #Get time
    now = datetime.now()
    date_time = now.strftime("%Y/%m/%d, %H:%M:%S")
    #Get ID of log
    numcommits = getNumCommits(log)
    logId = int(now.strftime("%Y%m%d") + str(logIds[log]) + str(numcommits))
    #Check whether header exists
    doesExist = headerExists(logId)
  except:
    print("unsuccessful attempt to check if header exists")

  return jsonify(exists = doesExist)

@app.route('/get_config', methods=['GET', 'POST'])
def get_config():
  json_data = request.get_json()
  query = json_data["query"]
  name = query["name"]
  configs = {}

  print("received request to get configs")
  print('...')

  try:
    configs = getConfigsFromDatabase()
  except:
    print("unsuccessful attempt to retrieve configs")
    print("...")


  return jsonify(configs = configs)

def getConfigFromDatabase(name):
  global cursor
  configs = []
  select = "SELECT * FROM part WHERE name=?;"
  for row in cursor.execute(select,name):
    configs.append([row[1],row[2]])
  return configs

@app.route('/get_configs', methods=['GET', 'POST'])
def get_configs():
  json_data = request.get_json()
  query = json_data["query"]
  configs = {}

  print("received request to get configs")
  print('...')

  try:
    configs = getConfigsFromDatabase()
  except:
    print("unsuccessful attempt to retrieve configs")
    print("...")

  return jsonify(configs = configs)

def loadConfigs():
  configs = getConfigsFromDatabase()
  #TODO
  return configs


def getConfigsFromDatabase():
  global cursor
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
  if os.path.isfile(database_path):
    setUpDatabase()
  else:
    createDatabase()
  app.run(port=int("4000"), debug = True)
