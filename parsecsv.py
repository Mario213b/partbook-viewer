import csv
import os
import json
import string

fileList = [f for f in os.listdir('csv') if (os.path.isfile('csv/' + f) and f.endswith('.csv'))]
csvDicts = {}

for curFile in fileList:
	dictIndex = string.split(curFile, ".")[0]
	csvFile = open('csv/' + curFile, 'rU')
	csvDict = csv.DictReader(csvFile)
	csvDicts[dictIndex] = []
	curPage = 1
	for curLine in csvDict:
		while len(csvDicts[dictIndex]) <= int(curLine['folio_end']):
			csvDicts[dictIndex].append(curLine['compositionKey'])
			curPage += 1
			
with open('partbooks.json', 'w') as outfile:
	json.dump(csvDicts, outfile)

print "Completed."