/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// in the future we'll probably need a visitCollection too
var linkCollection, encounterCollection;

exports.init = function(lCollection, eCollection) {
    linkCollection = lCollection;
    encounterCollection = eCollection;
}

exports.getTotalLinks = function(callback) {
    linkCollection.count(callback);
}
exports.getTotalEncounters = function(callback) {
    encounterCollection.count(callback);
}

// handy to check all the original urls we've seen to know if we already have a link expanded/done
exports.checkURL = function(origUrl, callback) {
    encounterCollection.find({orig:origUrl}, {limit:1}, function(err, cursor){
        if(err) return callback();
        cursor.nextObject(function(err, item){
            if(err || !item || !item.link) return callback();
            callback(item.link);
        });
    });
}

// either gets a single link arg:{url:...} or can paginate all arg:{start:10,limit:10}
exports.getLinks = function(arg, cbEach, cbDone) {
    var f = (arg.link)?{id:arg.link}:{};
    delete arg.id;
    findWrap(f,arg,linkCollection,cbEach,cbDone)
}

// either gets a single encounter arg:{id:...,network:...,link:...} or multiple from just a link arg:{link:...} and can paginate all arg:{start:10,limit:10}
exports.getEncounters = function(arg, cbEach, cbDone) {
    var f = (arg.link)?{link:arg.link}:{}; // link search
    if(arg.id) f = {id:arg.network+':'+arg.id+':'+arg.link}; // individual encounter search
    delete arg.id;
    delete arg.network;
    delete arg.link;
    findWrap(f,arg,linkCollection,cbEach,cbDone)
}

function findWrap(a,b,c,cbEach,cbDone){
    c.find(a, b, function(err, cursor){
        if(err) return cbDone(err);
        cursor.each(function(err, item){if(item != null) cbEach(item)});
        cbDone();
    });
}


// insert new link, ignore or replace if it already exists?
exports.addLink = function(link, callback) {
    linkCollection.findAndModify(XXX, [['_id','asc']], 
                             {$set:{'url':url}}, 
                             {safe:true, upsert:true, new: true}, callback);
}

// insert new encounter, replace any existing
exports.addEncounter = function(encounter, callback) {
    // create unique id as encounter.network+':'+encounter.id+':'+link, sha1 these or something?
    encounterCollection.findAndModify(XXX, [['_id','asc']], 
                             {$set:{'url':url}}, 
                             {safe:true, upsert:true, new: true}, callback);
}

    
