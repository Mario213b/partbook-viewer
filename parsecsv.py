import csv
import os
import json

fileList = [f for f in os.listdir('csv') if (os.path.isfile('csv/' + f) and f.endswith('.csv'))]
csvDicts = {}

for curFile in fileList:
	csvFile = open('csv/' + curFile, 'rU')
	csvDict = csv.DictReader(csvFile)
	csvDicts[curFile] = []
	for curLine in csvDict:
		csvDicts[curFile].append(curLine['compositionKey'])

with open('partbooks.json', 'w') as outfile:
	json.dump(csvDicts, outfile)