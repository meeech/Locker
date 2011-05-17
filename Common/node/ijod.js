/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/


/*
* Indexed JSON On Disk
*/

var fs = require('fs'),
    lfs = require(__dirname + '/lfs'),
    sqlite = require('sqlite');


exports.createIJOD = function(name, indexedFields, callback) {
    if(!callback && typeof indexedFields == 'function') {
        callback = indexedFields;
        indexedFields = null;
    }
    var self = {
        name:name,
        indexFile : name + '/' + name + '.index',
        dataFile : name + '/' + name + '.json',
        dbFile : name + '/' + name + '.db',
        indexListFile : name + '/' + name + '.json',
        indexedFields:indexedFields
    };
    var db = new sqlite.Database();
    validateIJOD(self.name, function(err) {
        self.dataStream = fs.createWriteStream(self.dataFile, {'flags':'a', 'encoding': 'utf-8'});
        self.indexStream = fs.createWriteStream(self.indexFile, {'flags':'a', 'encoding': 'utf-8'});
        db.open(self.dbFile, function(error) {
            readIndex(self.indexFile, function(indexArray) {
                self.index = indexArray;
                lfs.readObjectsFromFile(self.indexListFile, function(readIndexedFields) {
                    if(!self.indexedFields && readIndexedFields)
                        self.indexedFields = readIndexedFields;
                    if(self.indexedFields) {
                        addIndicies(0, function(err) {
                            addFunctions();
                            callback(self);
                        });
                    } else {    
                        addFunctions();
                        callback(self);
                    }
                });
            });
        });
    });
    
    function addFunctions() {
        self.addRecord = function(record) {
            var str = JSON.stringify(record) + '\n';
            self.dataStream.write(str);
            var end = str.length;
            str = null;
            if(self.index.length > 0)
                end += self.index[self.index.length - 1];
            self.index.push(end);
            self.indexStream.write(end + '\n');
            for(var i in self.indexedFields)
                addIndexedValue(self.indexedFields[i], record);
        }
        self.getAfterRecordID = function(recordID, callback) {
            var start = recordID >= 0? self.index[recordID]: 0;
            readObjectsFromFile(name + '/' + name + '.json', start, null, callback);
        }
        self.getAfterFieldsValueEquals = function(fieldName, fieldValue, callback) {
            findGreaterThanIndex(fieldName, fieldValue, function(err, docs) {
                if(err)
                    callback(err);
                else
                    self.getAfterRecordID(docs[0].mainIndex - 1, callback);
            });
        }
        self.close = function() {
            self.dataStream.end();
            self.dataStream.destory();
            self.indexStream.end();
            self.indexStream.destory();
        }
    }
    
    function addIndexedValue(field, record) {
        var sql = 'INSERT OR REPLACE INTO ' + field.fieldName +' (indexedValue, mainIndex) VALUES (?, ?);';
        db.execute(sql, [record[field.fieldName], self.index.length - 1], function(err) {
            if(err)
                console.error(err);
        });
    }
    
    function findGreaterThanIndex(fieldName, value, callback) {
        var sql = 'SELECT mainIndex FROM ' + fieldName + ' WHERE indexedValue > ? ORDER BY indexedValue LIMIT 1;';
        db.execute(sql, [value], callback);
    }
    
    function addIndicies(i, callback) {
        // console.log('self.indexedFields[i]:',self.indexedFields[i]);
        if(i == self.indexedFields.length) {
            callback();
            return;
        }
        var field = self.indexedFields[i];
        // console.log('create sql:', 'CREATE TABLE ' + field.fieldName + ' (indexedValue ' + field.fieldType + ', mainIndex INTEGER);');
        db.execute('CREATE TABLE ' + field.fieldName + ' (indexedValue ' + field.fieldType + ', mainIndex INTEGER);', function(err) {
            if(err)
                callback(err);
            else
                addIndicies(i+1, callback);
        });
    }
}


function validateIJOD(name, callback) {
    fs.readdir(name, function(err, files) {
        if(err) { //dir doesn't exist
            fs.mkdir(name, 0755, function(err) {
                callback();
            });
        } else {
            callback();
        }
    });
}

function touch(path) {
    fs.createWriteStream(path, {'flags':'a', 'encoding': 'utf-8'}).end();
}


function readIndex(path, callback) {
    var stream = fs.createReadStream(path, {'encoding': 'utf-8'});
    var data = "";
    stream.on('data', function(newData) {
        data += newData;
    });
    stream.on('end', function() {
        var itemStrings = data.split('\n');
        var items = [];
        for(var i = 0; i < itemStrings.length; i++) {
            if(itemStrings[i])
                items.push(parseInt(itemStrings[i]));
        }
        callback(items);
    });
    stream.on('error', function(err) {
        callback([]);
    });
}

function readObjectsFromFile(path, start, end, callback) {
    var options = {'encoding': 'utf-8'};
    if(start) {
        options.start = start;
        if(end && end > start)
            options.end = end;
    }
    var stream = fs.createReadStream(path, options);
    var data = "";
    stream.on('data', function(newData) {
        data += newData;
    });
    stream.on('end', function() {
        var itemStrings = data.split('\n');
        var items = [];
        for(var i = 0; i < itemStrings.length; i++) {
            if(itemStrings[i])
                items.push(JSON.parse(itemStrings[i]));
        }
        callback(null, items);
    });
    stream.on('error', function(err) {
        callback(err, []);
    });
}
// 
// createIJOD('testijod', [{fieldName:'ts', fieldType:'REAL'}], function(ijod) {
//     var date1 = 10;
//     ijod.addRecord({'ts':10, 'data': {'screen_name':'smurthas', 'id_str':'1523467'}});
//     ijod.addRecord({'ts':100, 'data': {'screen_name':'jsoncavnr', 'id_str':'i love music'}});
//     ijod.addRecord({'ts':1000, 'data': {'screen_name':'jeremie', 'id_str':'42'}});
//     ijod.getAfterRecordID(-1, function(err, objects) {
//         console.log('objs!:' + JSON.stringify(objects));
//         ijod.getAfterFieldsValueEquals('ts', 99, function(err, docs) {
//             console.log('getAfterField:', docs);
//         });
//     });
//     console.log('done!!');
// });