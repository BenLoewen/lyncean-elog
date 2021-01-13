import base64
import os
import sqlite3
import shutil
from datetime import datetime

INSTALLATION_LOCATION = "/home/bloewen/elog/lyncean-elog/"
COMMON_FOLDER = INSTALLATION_LOCATION + "common/"

class Database:
    def __init__(self,database_path):
        self.openDatabase(database_path)

    def openDatabase(self, database_path):
        self.db = sqlite3.connect(':memory:')
        self.db = sqlite3.connect(database_path)
        self.cursor = self.db.cursor()

    def closeDatabase(self):
        self.db.close()

    def logHeaderExists(self,log):
        logId = self.getOpenLogId(log)
        return self.headerExists(logId)

    def headerExists(self,logId):
        select = 'SELECT header FROM log WHERE id =?;'
        for row in self.cursor.execute(select,[logId]):
            if row[0] is None:
                return False
            else:
                return True
        return False

    def getOpenLogId(self,log):
        select = 'SELECT MAX(id) FROM log WHERE logtype="' + log + '";'
        for row in self.cursor.execute(select):
            return row[0]

    def addTestConfiguration(self,log,operator,configname):
        entryId,logId = self.addEntry(operator,log)
        self.addTest(operator,configname,entryId)
        insert = '''
                UPDATE LOG
                SET header=?
                WHERE id=?;
                '''
        self.cursor.execute(insert,(entryId,logId))
        self.db.commit()

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
        entryId,logId = self.addEntry(author,log)
        appendedId = 0
        self.addComment(comment,entryId,appendedId)
        self.addImage(image,log,entryId,appendedId)
        if tag != "None":
            self.addTag(tag,entryId)

    def addImage(self,img,log,entryId,appendedId):
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
        date = now.strftime("/%Y/%m/%d/")
        target = COMMON_FOLDER + date
        name = os.path.basename(image_path)
        if not os.path.isdir(target):
            os.mkdir(target)
        destination="/".join([target, name])
        shutil.copy(image_path, destination)