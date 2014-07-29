import csv
import os
import json
import string
import operator

fileList = [f for f in os.listdir('csv') if (os.path.isfile('csv/' + f) and f.endswith('.csv'))]
csvDicts = {}
pieces = {}

for curFile in fileList:
	dictIndex = string.split(curFile, ".")[0]
	csvFile = open('csv/' + curFile, 'rU')
	csvDict = csv.DictReader(csvFile)
	csvDicts[dictIndex] = {}

	for curLine in csvDict:
		if curLine['compositionKey'] not in pieces:
			pieces[curLine['compositionKey']] = curLine['text_incipit_standard Copy'] 

		csvDicts[dictIndex][curLine['compositionKey']] = range(int(curLine['folio_start']), int(curLine['folio_end']))

sortedPieces = sorted(pieces.iteritems(), key=operator.itemgetter(1))

assembledDict = {'pieces': sortedPieces, 'csvData': csvDicts}

with open('partbooks.json', 'w') as outfile:
	json.dump(assembledDict, outfile, ensure_ascii=False)

print "Completed."