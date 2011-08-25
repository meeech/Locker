/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    locker = require('../../Common/node/locker.js');
    
var lsearch = require("../../Common/node/lsearch");

var lockerInfo;
var express = require('express'),
    connect = require('connect');
var async = require('async');
var app = express.createServer(connect.bodyParser());

app.set('views', __dirname);

app.get('/', function(req, res) {
    res.send("You should use a search interface instead of trying to talk to me directly.");
});

function handleError(type, action, id, error) {
    console.error('Error attempting to ' + action + ' index of type "' + type + '" and id: ' + id + ' - ' + error);
}

app.post("/events", function(req, res) {
    if (req.headers["content-type"] === "application/json" && req.body) {
        if (req.body.type === "contact/full") {
            if (req.body.action === "new" || req.body.action === "update") {
                lsearch.indexType("contact", req.body.obj.data, function(err, time) {
                    if (err) { handleError(req.body.type, req.body.action, req.body._id, err); }
                });
            } else if (req.body.action === "delete") {
                lsearch.deleteDocument(req.body.obj.data._id, function(err, time, docsDeleted) {
                    if (err) { handleError(req.body.type, req.body.action, req.body._id, err); }
                    console.log('Received delete event for contact/full id: ' + req.body._id);
                });
            }
            res.end();
        } else if (req.body.type === "status/twitter") {
            if (req.body.action === "new" || req.body.action === "update") {
                lsearch.indexType(req.body.type, req.body.obj.status, function(err, time) {
                    if (err) { handleError(req.body.type, req.body.action, req.body._id, err); }
                });
            } else if (req.body.action === "delete") {
                lsearch.deleteDocument(req.body.obj.data._id, function(err, time, docsDeleted) {
                    if (err) { handleError(req.body.type, req.body.action, req.body._id, err); }
                });
            }
            res.end();
        } else if (req.body.type) {
            if (req.body.action === "new" || req.body.action === "update") {
                lsearch.indexType(req.body.type, req.body.obj, function(err, time) {
                    if (err) { handleError(req.body.type, req.body.action, req.body._id, err); }
                });
            } else if (req.body.action === "delete") {
                lsearch.deleteDocument(req.body.obj.data._id, function(err, time, docsDeleted) {
                    if (err) { handleError(req.body.type, req.body.action, req.body._id, err); }
                });
            }
            res.end();
        } else {
            console.log("Unexpected event: " + req.body.type + " and " + req.body.action);
            res.end();
        }
    } else {
        console.log("Unexpected event or not json " + req.headers["content-type"]);
        res.end();
    }
});

app.post("/index", function(req, res) {
    if (!req.body.type || !req.body.value) {
        res.writeHead(400);
        res.end("Invalid arguments");
        return;
    }
    
    try {
        var value = JSON.parse(req.body.value);
    } catch(E) {
        res.writeHead(500);
        res.end("invalid json in value");
        return;
    }
    lsearch.indexType(req.body.type, value, function(error, time) {
        if (error) {
            res.writeHead(500);
            res.end("Could not index: " + error);
            return;
        }
        res.send({indexTime:time});
    });
});

app.get("/query", function(req, res) {
    var q = req.param("q");
    var type = req.param("type");
    
    if (!q || q === '*') {
        res.writeHead(400);
        res.end("Please supply valid query string");
        return;
    }

    function sendResults(err, results, queryTime) {
        if (err) {
            res.writeHead(500);
            res.end("Error querying: " + err);
            return;
        }
		
		enrichResultsWithFullObjects(results, function(err, richResults) {
			var data = {};
			data.took = queryTime;
			
			if (err) {
				data.error = err;
				data.hits = [];
				res.send(data);
			}
			
			data.error = null;
			data.hits = richResults;     
	        res.send(data);
		});
    }
    if (type) {
        lsearch.queryType(type, q, {}, sendResults);
    } else {
        lsearch.queryAll(q, {}, sendResults);
    }
});

function cullAndSortResults(results, callback) {
	var resultSet = [];
	// group results by type
	
	// sort each type category by relevance score
	
	callback(null, resultSet);
}

function enrichResultsWithFullObjects(results, callback) {
	// fetch full objects of results
	async.waterfall({
		cullAndSort: function(waterfallCb) {
			cullAndSortResults(results, function(err, results) {
				waterfallCb(err, results);
			});
		},
		enrich: function(results, waterfallCb) {
			forEachSeries(results, function(item, function(err, item) {
				var splitType = item._type.split('/');
				if (splitType.length > 1) {
					// query /Me/:collectionId/:id
					// item = updatedItem
				} else {
					// get all syncletIds of the given type
					// for each syncletId
						// query /Me/:syncletId/:type/:id
						// push result onto resultSet;
					//
				}
			}), 
			function(err) {
				waterfallCb(err, results);
			});	
		}
	},
	function(err, results) {		
		if (err) {	
			callback('Error when attempting to sort and enrich search results: ' + err, []);
		}
		callback(null, results);
	});
}

// Process the startup JSON object
process.stdin.resume();
var allData = "";
process.stdin.on('data', function(data) {
    allData += data;
    if (allData.indexOf("\n") > 0) {
        data = allData.substr(0, allData.indexOf("\n"));
        lockerInfo = JSON.parse(data);
        locker.initClient(lockerInfo);
        if (!lockerInfo || !lockerInfo['workingDirectory']) {
            process.stderr.write('Was not passed valid startup information.'+data+'\n');
            process.exit(1);
        }
        process.chdir(lockerInfo.workingDirectory);

        lsearch.setEngine(lsearch.engines.CLucene);
        lsearch.setIndexPath(process.cwd() + "/search.index");
        
        app.listen(lockerInfo.port, 'localhost', function() {
            process.stdout.write(data);
        });
    }
});
