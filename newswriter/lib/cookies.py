COOKIES_FILE = "cookies.txt"


def setCookie(name,value):
    try:
        f = open(COOKIES_FILE,"r")
        lines = f.readlines()
        f.close()
    except:
        lines = []
    newLines = []
    appendVal = False
    foundName = False
    for line in lines:
        if appendVal:
            newLines.append(value + "\n")
            appendVal = False
        else:
            newLines.append(line)
        if line.strip()==name:
            appendVal = True
            foundName = True
    if not foundName:
        newLines.append(name+"\n")
        newLines.append(value+"\n")
    f = open(COOKIES_FILE,"w+")
    for newLine in newLines:
        f.write(newLine)
    f.close()


def getCookie(name):
    try:
        f = open(COOKIES_FILE, "r")
    except:
        return ""
    lines = f.readlines()
    valIsNext = False
    for i in range(len(lines)):
        l = lines[i].strip()
        if valIsNext:
            return l
        if l==name and i%2==0:
            valIsNext = True
    return ""

if __name__ == "__main__":
    setCookie("username","Benjamin")
    setCookie("log","operations")
    print(getCookie("log"))
    setCookie("log","electronics")
    print(getCookie("log"))