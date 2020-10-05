from flask import Flask
from flask import render_template
from flask import Response, request, jsonify
import sqlite3
from datetime import datetime
import time
app = Flask(__name__)


current_id = 31
lastSearch = None
deleted = dict()
data = []
cursor = None
db = None
curr_entryId = 0
curr_appendedId = 0
logIds = {"testing":1,"operations":2,"custom":3}
autocommitLog = {"testing":True,"operations":False,"custom":True}
numLogsCommittedToday = {"testing":0,"operations":0,"custom":0}

def createDatabase():
  print("setting up the database...")
  cursor.execute('''
    CREATE TABLE log(id INTEGER PRIMARY KEY, title TEXT,
                       type TEXT, committed DATETIME, header INTEGER)
  ''')
  print("created table: log")
  cursor.execute('''
    CREATE TABLE entry(id INTEGER PRIMARY KEY, log INTEGER, author TEXT,
                       type TEXT, submitted DATETIME)
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
    CREATE TABLE test(operator TEXT, name TEXT, entry INTEGER)
  ''')
  print("created table: test")
  cursor.execute('''
    CREATE TABLE part(name TEXT, pname TEXT, pconfig TEXT)
  ''')
  print("created table: part")
  db.commit()
  print("all tables have been committed to the database")
  print("...")

def openDatabase():
  global cursor
  global db
  print("opening database...")
  db = sqlite3.connect(':memory:')
  db = sqlite3.connect('data/elog')
  cursor = db.cursor()
  print("database ready to use")
  print("...")

def setUpDatabaase():
  global cursor
  time.sleep(.300)
  openDatabase()
  #NEED TO SET IDs
  #TODO

def closeDatabase():
  global cursor
  global db
  db.close()
  print("closed database.")

def autocommitLogs():
  for log in logIds:
    if autocommitLog[log]:
      #TODO
      pass

def createTodaysLogs():
  global cursor
  autocommitLogs()
  now = datetime.now()
  date = now.strftime("%Y/%m/%d")
  date_id = now.strftime("%Y%m%d")
  print("creating logs for " + date + " ...")
  for log in logIds:
    if autocommitLog[log] == True:
      id = date_id + str(logIds[log]) + str(numLogsCommittedToday[log])
      insert = '''
            INSERT INTO LOG (TITLE,TYPE,ID,COMMITTED,HEADER)
            VALUES (?, ?, ?, NULL, NULL);
            '''
      data_tuple = (log + " " + date, log, int(id))
      cursor.execute(insert, data_tuple)
      numLogsCommittedToday[log] = 0
      print("started " + log + " log")
    else:
      print("skipping " + log + " log")
  print("done creating logs")
  print('...')

def addEntry(author,log):
  global cursor
  global curr_entryId
  #Get time
  now = datetime.now()
  date_time = now.strftime("%Y/%m/%d, %H:%M:%S")
  #Get ID of log
  logId = int(now.strftime("%Y%m%d") + str(logIds[log]) + str(numLogsCommittedToday[log]))
  #Get ID of entry
  entryId = curr_entryId
  curr_entryId+=1
  #Insert entry into database
  insert = '''
          INSERT INTO ENTRY (SUBMITTED,AUTHOR,LOG,ID,TYPE)
          VALUES (?, ?, ?, ?, ?);
          '''
  data_tuple = (date_time, author, logId, entryId, log)
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
  print("updated header with test configuration")


def addTest(operator,name,entry):
  global cursor
  insert = '''
          INSERT INTO TEST (OPERATOR,NAME,ENTRY)
          VALUES (?, ?, ?);
          '''
  data_tuple = (operator, name, entry)
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

def addLogPost(log, author, comment, files, images, isAppended):
  entryId,logId = addEntry(author,log)
  #Add post data to databse
  appendedId = 0
  if isAppended:
    appendedId=addAppendedStamp(author)
  addComment(comment,entryId,appendedId)
  for f in files:
    addFile(f,entryId,appendedId)
  for img in images:
    addImage(img,entryId,appendedId)

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

def addFile(path,entryId,appendedId):
  global cursor
  insert = '''
          INSERT INTO FILE (PATH,ENTRY,APPENDED)
          VALUES (?, ?, ?);
          '''
  data_tuple = (path,entryId,appendedId)
  cursor.execute(insert, data_tuple)
  print("inserted new file into file table")

def addImage(url,entryId,appendedId):
  global cursor
  insert = '''
          INSERT INTO IMAGE (URL,ENTRY,APPENDED)
          VALUES (?, ?, ?);
          '''
  data_tuple = (url,entryId,appendedId)
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

def getLogData(logId):
  global cursor
  entries = []
  for row in cursor.execute('SELECT * FROM ENTRY WHERE LOG=?',logId):
    entries.append(row)
    print(row)
  log_info = {}
  for row in cursor.execute('SELECT * FROM LOG WHERE ID=?',logId):
    print(row)
  return



#All routes
#add_entry: for adding new log entry
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
  isAppended = query["isAppended"]
  success = None

  try:
    addLogPost(log, author, files, comment,images,isAppended)
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

  return jsonify(successfullyWritten = success)


@app.route('/header_exists', methods=['GET', 'POST'])
def header_exists():
  json_data = request.get_json()
  query = json_data["query"]

  print("received request to know if header exists")
  print('...')

  log = query["log"]
  does = True
  if numLogsCommittedToday[log]==0:
    does = False
    print("no header exists for today's " + log + " log")
    print('...')
  else:
    print("header exists for today's " + log + " log")
    print('...')

  return jsonify(exists = does)



@app.route('/view/<id>')
def view(id=None):
  global data
  global deleted
  d = None
  for i in range(len(data)):
    v = data[i]
    if v["id"] == int(id):
      d = v
  mark_as_deleted = []
  for i in range(len(d["tags"])):
    if int(id) not in deleted or i not in deleted[int(id)]:
      mark_as_deleted.append(0)
    else:
      mark_as_deleted.append(1)
  return render_template('view_data.html', id=d["id"], title=d["title"], video=d["video"], description=d["description"], thousands_of_reddit_upvotes = d["thousands_of_reddit_upvotes"], tags = d["tags"], deleted = mark_as_deleted)

@app.route('/edit/<id>')
def edit(id=None):
  d = None
  for i in range(len(data)):
    v = data[i]
    if v["id"] == int(id):
      d = v
  print(str(d["id"]) + '\n')
  return render_template('edit_data.html',tags = d["tags"], id= d["id"])

@app.route('/create_entry', methods=['GET', 'POST'])
def create_entry():
  global data
  global current_id

  json_data = request.get_json()
  new_entry = json_data
  new_entry["id"] = current_id
  data.append(new_entry)
  print(len(data))
  print(new_entry)
  return_data = {"id":current_id}
  current_id +=1
  return jsonify(data = return_data)

@app.route('/change_entry', methods=['POST', 'GET'])
def change_entry():
  global data
  json_data = request.get_json()
  query = json_data
  to_edit = int(query["id"])
  new_tags = query["tags"]
  new_desc = query["description"]
  deleted[to_edit] = set()
  for d in data:
    if d["id"] == to_edit:
      d["tags"] = new_tags
      d["description"] = new_desc
  return jsonify(data = data)

@app.route('/delete_data', methods=['GET', 'POST'])
def delete_data():
  global data
  global current_id
  global lastSearch
  json_data = request.get_json()
  query = json_data
  to_delete = int(query["id"])
  for d in data:
    if d["id"] == to_delete:
      data.remove(d)
  for d in lastSearch:
    if d["id"] == to_delete:
      lastSearch.remove(d)
  return_data = lastSearch
  return jsonify(data = return_data)


@app.route('/remove_index', methods=['GET', 'POST'])
def remove_index():
  global data
  global deleted
  json_data = request.get_json()
  query = json_data
  id = int(query["id"])
  index = int(query["index"])
  if id not in deleted:
    deleted[id] = set()
  deleted[id].add(index)
  print(deleted[id])
  to_change = None
  for d in data:
    if d["id"] == id:
      to_change = d
  return_tags = to_change["tags"]
  mark_as_deleted = []
  for i in range(len(to_change["tags"])):
    if i not in deleted[id]:
      mark_as_deleted.append(0)
    else:
      mark_as_deleted.append(1)
  return jsonify(tags = return_tags, deleted = mark_as_deleted)

@app.route('/add_back', methods=['GET', 'POST'])
def add_back():
  global data
  global deleted
  json_data = request.get_json()
  query = json_data
  id = int(query["id"])
  index = int(query["index"])
  deleted[id].remove(index)
  to_change = None
  for d in data:
    if d["id"] == id:
      to_change = d
  return_tags = to_change["tags"]
  mark_as_deleted = []
  for i in range(len(to_change["tags"])):
    if i not in deleted[id]:
      mark_as_deleted.append(0)
    else:
      mark_as_deleted.append(1)
  return jsonify(tags = return_tags, deleted = mark_as_deleted)
  

@app.route("/")
def my_index():
    return render_template("index.html")


if __name__ == '__main__':
  setUpDatabaase()
  app.run(port=int("4000"), debug = True)
