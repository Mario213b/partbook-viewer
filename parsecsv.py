import csv
import os
import json
import string
import operator

fileList = [f for f in os.listdir('csv') if (os.path.isfile('csv/' + f) and f.endswith('.csv'))]
csvDicts = {}
pieces = {}
pageDirectory = [{} for i in range(205)]
filenames = []

for curFile in fileList:
    dictIndex = string.split(curFile, ".")[0]
    csvFile = open('csv/' + curFile, 'rU')
    csvDict = csv.DictReader(csvFile)
    csvDicts[dictIndex] = {}
    filenames.append(dictIndex)

    for curLine in csvDict:
        if curLine['compositionKey'] not in pieces:
            pieces[curLine['compositionKey']] = curLine['text_incipit_standard Copy']

        pageRange = range(int(curLine['folio_start']) - 1, int(curLine['folio_end']))  # -1 because diva is 0-index
        csvDicts[dictIndex][curLine['compositionKey']] = pageRange

        for curPage in pageRange:
            try:
                try:
                    pageDirectory[curPage][dictIndex] += ", " + curLine['compositionKey']
                except KeyError:
                    pageDirectory[curPage][dictIndex] = curLine['compositionKey']
            except IndexError:
                pageDirectory[curPage] = {}
                pageDirectory[curPage][dictIndex] = curLine['compositionKey']


csvFileOut = open('csvOut.csv', 'w')
csvDictOut = csv.DictWriter(csvFileOut, fieldnames=filenames)
print(json.dumps(pageDirectory, indent=4))
csvDictOut.writer.writerow(filenames)
csvDictOut.writerows(pageDirectory)

sortedPieces = sorted(pieces.iteritems(), key=operator.itemgetter(1))

assembledDict = {'pieces': sortedPieces, 'debugPieces': pieces, 'csvData': csvDicts}

with open('partbooks.json', 'w') as outfile:
    json.dump(assembledDict, outfile, ensure_ascii=False)

print("Completed.")
