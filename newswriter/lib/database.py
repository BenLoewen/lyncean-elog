import base64
import os
import sqlite3
import shutil
from datetime import datetime


INSTALLATION_LOCATION, database_path, CONFIG_FOLDER, COMMON_FOLDER, SCREENCAP_FOLDER, TAG_FILE = None, None, None, None, None, None

class Database:
    def __init__(self,database_path):
        self.openDatabase(database_path)
        self.get_folders()
        self.get_logIds()

    def openDatabase(self, database_path):
        self.db = sqlite3.connect(':memory:')
        self.db = sqlite3.connect(database_path)
        self.cursor = self.db.cursor()

    def closeDatabase(self):
        self.db.close()

    def get_folders(self):
        global INSTALLATION_LOCATION, CONFIG_FOLDER, COMMON_FOLDER, TAG_FILE
        cwd = os.getcwd()
        INSTALLATION_LOCATION = os.path.dirname(cwd)
        CONFIG_FOLDER = INSTALLATION_LOCATION + "/config/configs.txt"
        COMMON_FOLDER = INSTALLATION_LOCATION + "/common/"
        TAG_FILE = INSTALLATION_LOCATION + "/config/tags.txt"


    def get_logIds(self):
        self.logIds = {}
        f = open(TAG_FILE, 'r')
        lines = f.readlines()
        all_logs = []
        for line in lines:
            if line.startswith("#"):
                log_name = line.strip().lower()[1:]
                all_logs.append(log_name)
                self.logIds[log_name] = len(all_logs)

    def headerExists(self,log):
        now = datetime.now()
        date_time = now.strftime("%Y/%m/%d")
        select = 'SELECT MAX(date) FROM log WHERE logtype =?;'
        for row in self.cursor.execute(select,[log]):
            print(row[0])
            if row[0] == date_time:
                return True
            else:
                return False
        return False

    def getOpenLogId(self,log):
        now = datetime.now()
        dateId = now.strftime("%Y%m%d")
        logId = dateId + str(self.logIds[log])
        return int(logId)

    def createLog(self,log):
        now = datetime.now()
        date = now.strftime("%Y/%m/%d")
        date_id = now.strftime("%Y%m%d")
        print("creating log for today")
        logName = log.capitalize()
        id_ = date_id + str(self.logIds[log])
        insert = '''
                INSERT INTO LOG (TITLE,ID,LOGTYPE,DATE,HEADER)
                VALUES (?, ?, ?, ?, NULL);
                '''
        data_tuple = (logName + " Log " + date, int(id_), log, date)
        self.cursor.execute(insert, data_tuple)
        self.db.commit()

    def addTestConfiguration(self,log,operator,configname):
        print("adding test configuration")
        entryId,logId = self.addEntry(operator,log)
        self.addTest(operator,configname,entryId)
        insert = '''
                UPDATE LOG
                SET header=?
                WHERE id=?;
                '''
        self.cursor.execute(insert,(entryId,logId))
        self.db.commit()
        self.addParts(configname)

    def addTest(self,operator,name,entry):
        insert = '''
                INSERT INTO TEST (OPERATOR,NAME,ENTRY,TIME)
                VALUES (?, ?, ?, ?);
                '''
        now = datetime.now()
        date_time = now.strftime("%Y/%m/%d, %H:%M:%S")
        data_tuple = (operator, name, entry,date_time)
        self.cursor.execute(insert, data_tuple)
        self.db.commit()

    def addEntry(self,author,log):
        logId = self.getOpenLogId(log)
        #Get ID of entry
        self.fetchIds()
        self.curr_entryId+=1
        entryId = str(self.curr_entryId)
        now = datetime.now()
        date_time = now.strftime("%Y/%m/%d, %H:%M:%S")
        #Insert entry into database
        insert = '''
                INSERT INTO ENTRY (SUBMITTED,AUTHOR,LOG,ID,TYPE)
                VALUES (?, ?, ?, ?, ?);
                '''
        data_tuple = (date_time, author, int(logId), int(entryId), log)
        self.cursor.execute(insert, data_tuple)
        self.db.commit()
        print("inserted new entry into entry table")
        return entryId,logId

    def fetchIds(self):
        select = "SELECT MAX(id) FROM entry;"
        for row in self.cursor.execute(select):
            max_id = row[0]
            if max_id is None:
                self.curr_entryId = 0
            else:
                self.curr_entryId = int(max_id) + 1

    def addLogPost(self,log, author, comment, image, tag):
        print(author)
        print(comment)
        print(image)
        entryId,logId = self.addEntry(author,log)
        appendedId = 0
        self.addComment(comment,entryId,appendedId)
        self.addImage(image,log,entryId,appendedId)
        if tag != "None":
            self.addTag(tag,entryId)

    def addImage(self,img,log,entryId,appendedId):
        print("adding image")
        name = os.path.basename(img)
        data = self.get_base64_encoded_image(img)
        insert = '''
                INSERT INTO IMAGE (NAME,BASE64,ENTRY,APPENDED)
                VALUES (?, ?, ?, ?);
                '''
        data_tuple = (name,data,entryId,appendedId)
        self.cursor.execute(insert, data_tuple)
        self.db.commit()
        self.saveImage(img)

    def get_base64_encoded_image(self,image_path):
        with open(image_path, "rb") as img_file:
            return base64.b64encode(img_file.read()).decode('utf-8')

    def addComment(self,text,entryId,appendedId):
        insert = '''
                INSERT INTO COMMENT (TEXT,ENTRY,APPENDED)
                VALUES (?, ?, ?);
                '''
        data_tuple = (text,entryId,appendedId)
        self.cursor.execute(insert, data_tuple)
        self.db.commit()

    def addTag(self,tag,entryId):
        insert = '''
                INSERT INTO tag (ENTRY,TAG)
                VALUES (?, ?);
                '''
        data_tuple = (entryId,tag)
        self.cursor.execute(insert, data_tuple)
        self.db.commit()

    def saveImage(self,image_path):
        now = datetime.now()
        date = now.strftime("/%Y/%m/%d/").split("/")
        name = os.path.basename(image_path)
        target = COMMON_FOLDER
        for part in date:
            target += part + "/"
            if not os.path.isdir(target):
                os.mkdir(target)
        destination="/".join([target, name])
        shutil.copy(image_path, destination)


    def getConfigsFromFile(self):
        f = open(CONFIG_FOLDER,'r')
        lines = f.readlines()
        configs = {}
        curr_config = None
        for line in lines:
            if line.startswith('#'):
                config_name = line[1:].strip()
                configs[config_name] = []
                curr_config = config_name
            elif len(line)>1:
                split = line.index(":")
                part_name = line[0:split].lstrip()
                part_config = line[split+1:].rstrip()
                configs[curr_config].append([part_name,part_config])
        return configs

    def addPart(self,name,pname,pconfig):
        insert = '''
                INSERT INTO PART (NAME,PNAME,PCONFIG)
                VALUES (?, ?, ?);
                '''
        data_tuple = (name,pname,pconfig)
        self.cursor.execute(insert, data_tuple)
        self.db.commit()
        print("inserted part configuration")

    def addParts(self,config_name):
        try:
            configs = self.getConfigsFromFile()
            if config_name in configs:
                parts = configs[config_name]
                for part in parts:
                    addPart(config_name,part[0],part[1])
        except Exception:
            pass