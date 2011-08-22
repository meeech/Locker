/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// merge links from connectors

var fs = require('fs'),
    locker = require('../../Common/node/locker.js');
    
var dataIn = require('./dataIn'); // for processing incoming twitter/facebook/etc data types
var dataStore = require("./dataStore"); // storage/retreival of raw links and encounters
var util = require("./util"); // handy things for anyone and used within dataIn
var search = require("./search"); // our indexing and query magic

var lockerInfo;
var express = require('express'),
    connect = require('connect');
var app = express.createServer(connect.bodyParser());

app.set('views', __dirname);

app.get('/', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    dataStore.getTotalCount(function(err, countInfo) {
        res.write('<html><p>Found '+ countInfo +' links</p></html>');
        res.end();
    });
});

app.get('/state', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'application/json'
    });
    dataStore.getTotalCount(function(err, countInfo) {
        res.write('{"updated":'+new Date().getTime()+',"ready":1,"count":'+ countInfo +'}');
        res.end();
    });
});

app.get('/search', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'application/json'
    });
    res.write(JSON.stringify([
        {"link":"http://foo.com",
        "orig":"http://bit.ly/bar",
        "title":"This is Foo",
        "at":"1234567890",
        "network":"facebook",
        "from":"Bob",
        "fromID":"123456",
        "eid":"asdfasdf"},
        {"link":"http://bar.com",
        "orig":"http://bit.ly/foo",
        "title":"This is Bar",
        "at":"1234577890",
        "network":"twitter",
        "from":"Jane",
        "fromID":"@jane",
        "eid":"asdfasdfasdf"}
        ]));
    res.end();
});

app.get('/allLinks', function(req, res) {
    res.writeHead(200, {
        'Content-Type':'application/json'
    });
    dataStore.getAll(function(err, cursor) {
        cursor.toArray(function(err, items) {
            res.end(JSON.stringify(items));
        });
    });
});

app.get('/update', function(req, res) {
    dataIn.reIndex(locker);
    res.writeHead(200);
    res.end('Updating');
});

app.post('/events', function(req, res) {
    if (!req.body.obj.type || !req.body.via || !(req.body.type.indexOf('link/facebook') === 0 || req.body.type.indexOf('link/twitter') === 0)) {
        console.log('5 HUNDO bad data:',JSON.stringify(req.body));
        res.writeHead(500);
        res.end('bad data');
        return;
    }

    // handle asyncadilly
    dataIn.processEvent(req.body);
    res.writeHead(200);
    res.end('ok');
});

// Process the startup JSON object
process.stdin.resume();
process.stdin.on('data', function(data) {
    lockerInfo = JSON.parse(data);
    locker.initClient(lockerInfo);
    locker.lockerBase = lockerInfo.lockerUrl;
    if (!lockerInfo || !lockerInfo['workingDirectory']) {
        process.stderr.write('Was not passed valid startup information.'+data+'\n');
        process.exit(1);
    }
    process.chdir(lockerInfo.workingDirectory);
    
    locker.connectToMongo(function(mongo) {
        dataStore.init(mongo.collections.links);
        app.listen(lockerInfo.port, 'localhost', function() {
            process.stdout.write(data);
        });
    });
});
