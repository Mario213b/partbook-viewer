import csv
import os
import json
import string

fileList = [f for f in os.listdir('csv') if (os.path.isfile('csv/' + f) and f.endswith('.csv'))]
csvDicts = {}
pieces = {}

for curFile in fileList:
	dictIndex = string.split(curFile, ".")[0]
	csvFile = open('csv/' + curFile, 'rU')
	csvDict = csv.DictReader(csvFile)
	csvDicts[dictIndex] = []
	curPage = 1
	for curLine in csvDict:
		if curLine['compositionKey'] not in pieces:
			#print curLine
			pieces[curLine['compositionKey']] = curLine['text_incipit_standard Copy'] 
		while len(csvDicts[dictIndex]) <= int(curLine['folio_end']):
			csvDicts[dictIndex].append(curLine['compositionKey'])
			curPage += 1
			
assembledDict = {'pieces': pieces, 'csvData': csvDicts}

with open('partbooks.json', 'w') as outfile:
	json.dump(assembledDict, outfile, ensure_ascii=False)

print "Completed."