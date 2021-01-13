import sqlite3
from datetime import datetime, timedelta
import time
import os
import time
from reportlab.lib import colors, utils
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from server import getLogData, getEntries, getCursor, openDatabase, closeDatabase
from reportlab.lib.units import mm
from io import StringIO
from base64 import b64decode
import base64
import PIL

cursor = None
db = None


#INSTALLATION_LOCATION = "C:/Users/benja/Desktop/work/elog1.0/"
INSTALLATION_LOCATION = "/home/bloewen/elog/lyncean-elog/"

CONFIG_FOLDER = INSTALLATION_LOCATION + "config/configs.txt"
COMMON_FOLDER = INSTALLATION_LOCATION + "common/"

logIds = {1:"electronics",2:"operations"}

def getTodaysWrittenLogs():
  db,cursor = getCursor()
  start_d = datetime.today() - timedelta(days=2)
  end_d = datetime.today() - timedelta(days=1)
  start = start_d.strftime("%Y/%m/%d, 00:00:00")
  end = end_d.strftime("%Y/%m/%d, 00:00:00")
  get = 'SELECT id FROM log WHERE committed>\'' + start + '\' and committed<\'' + end + '\';'
  ids = []
  for row in cursor.execute(get):
    ids.append(row[0])
  return ids


def getDayOfLog(logId):
  logId = str(logId)
  year = int(logId[:4])
  month = int(logId[4:6])
  day = int(logId[6:8])
  log = logIds[int(logId[8:9])]
  x = datetime(year,month,day)
  return log,x

def getPathOfFile(name,logId):
  log,day = getDayOfLog(logId)
  for i in range(0,7):
    checkDay = day + timedelta(days=i)
    date = checkDay.strftime("/%Y/%m/%d/")
    path = COMMON_FOLDER + str(log) + date + name
    if(os.path.exists(path)):
      return path
  return None

def createDocument(logId):
  #Get log info
  data = getLogData(logId)
  entries = getEntries(logId)

  log,day = getDayOfLog(logId)
  date = day.strftime("/%Y/%m/%d/")
  name = data["title"].replace("/","-").replace(" ", "_") + ".pdf"
  path = COMMON_FOLDER + str(log) + date + name
  print(path)
  doc = SimpleDocTemplate(path,pagesize=letter,
                        rightMargin=72,leftMargin=72,
                        topMargin=72,bottomMargin=18)
  styles=getSampleStyleSheet()
  styles.add(ParagraphStyle(name='Center', alignment=TA_CENTER))
  styles.add(ParagraphStyle(name='Left', alignment=TA_LEFT))
  Layout = []

  #Title
  title = '<font size="24">%s</font>' % data["title"]
  Layout.append(Paragraph(title, styles["Center"]))
  Layout.append(Spacer(1, 40))

  #Operator
  op = '<font size="12">Operator(s)</font>'
  Layout.append(Paragraph(op, styles["Center"]))
  op_name = '<font size="12">%s</font>' % data["operator"]
  Layout.append(Paragraph(op_name, styles["Center"]))
  Layout.append(Spacer(1, 12))

  #Configuration Name
  config = '<font size="12">Configuration Name</font>'
  Layout.append(Paragraph(config, styles["Center"]))
  op_name = '<font size="12">%s</font>' % data["configname"]
  Layout.append(Paragraph(op_name, styles["Center"]))
  Layout.append(Spacer(1, 12))

  #Configuration Parts
  table = [["Components","Specifications"]]
  comps = data["comps"]
  specs = data["specs"]
  for i in range(len(comps)):
    table.append([comps[i],specs[i]])
  t = Table(table)
  t.setStyle(TableStyle([ ('INNERGRID', (0,0), (-1,-1), 0.25, colors.black),
                          ('BOX', (0,0), (-1,-1), 0.25, colors.black),
                          ('BACKGROUND', (0,0), (1,0), colors.gray)
                        ]))
  Layout.append(t)
  Layout.append(Spacer(1,20))

  for entry in entries:
    Layout = addEntry(Layout, entry, logId)

  doc.build(Layout)


def addEntry(Layout, entry, logId):
  Entry = []

  styles=getSampleStyleSheet()
  styles.add(ParagraphStyle(name='Center', alignment=TA_CENTER))
  styles.add(ParagraphStyle(name='Left', alignment=TA_LEFT))
  styles.add(ParagraphStyle(name='File', alignment=TA_CENTER, textColor = colors.Color(0,0,1) ))
  if len(entry["comments"])==0:
    return Layout
  posted = '<font size="8">Posted at %s by %s</font>' % (entry["author"],entry["time"])
  Entry.append(Paragraph(posted, styles["Left"]))

  #Add images
  images = entry["images"]
  for img in images:
    name = img[0]
    path = getPathOfFile(name,logId)
    if path is not None:
      img = utils.ImageReader(path)
      iw, ih = img.getSize()
      aspect = ih / float(iw)
      Entry.append(Image(path,150*mm, 150*mm*aspect, kind='bound'))

  #Add files
  files = entry["files"]
  for file in files:
    name = file[0]
    path = getPathOfFile(name,logId)
    if path is not None:
      link = '<a href=' + path + ' >' + name + '</a>'
      Entry.append(Paragraph(link, styles["File"]))

  #Add comments
  comments = entry["comments"]
  for comment in comments:
    comment_value = comment[0]
    appended = comment[1]
    c = '<font size="10">%s</font> <font size="7">%s</font>' % (comment_value, appended)
    Entry.append(Paragraph(c, styles["Center"]))

  Layout.append(KeepTogether(Entry))
  Layout.append(Spacer(1, 12))

  return Layout

if __name__ == '__main__':
  openDatabase()
  createDocument(2020120920)
  getTodaysWrittenLogs()
  closeDatabase()
