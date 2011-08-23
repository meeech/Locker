var clucene = require('clucene').CLucene;
var lucene = new clucene.Lucene();
var path = require('path');
var fs = require('fs');

// constants, graciously lifted from lsearch
var EStore = {
  STORE_YES: 1,
  STORE_NO: 2,
  STORE_COMPRESS: 4
};

var EIndex = {
  INDEX_NO: 16,
  INDEX_TOKENIZED: 32,
  INDEX_UNTOKENIZED: 64,
  INDEX_NONORMS: 128,
};

var indexPath, dataStore;
// tracks the dStore and makes sure index dir exists 
exports.init = function(dStore)
{
    dataStore = dStore;
    indexPath = process.cwd() + "/testsearch.index";
    if (!path.existsSync(indexPath)) {
      fs.mkdirSync(indexPath, 0755);
    };
    // TODO create queue for indexing
}

// basically just raw full lucene results
exports.search = function(q, callback){
    lucene.search(indexPath, "content:("+q+")",function(err, res, time){
        if(err) return callback(err);
        callback(res);
//        res = res.sort(function(a,b){return b.at < a.at});
    });
}

// trigger a re-index of a link, get it and all it's encounters and smush them into some text
exports.index = function(linkUrl, callback){
    var link;
    dataStore.getLinks({link:linkUrl},
        function(l) { link=l },
        function(err){
            if(err) return callback(err);
            var at=0;
            // array of all text parts, start with important link stuff
            var parts = [linkUrl,link.title];
            dataStore.getEncounters({link:linkUrl},
                function(e){
                    // track newest for sorting timestamp
                    if(e.at > at) at = e.at;
                    // add text parts of each encounter, except via
                    for(var a in e){if(a != "via") parts.push(e[a])};
                },
                function(err){
                    if(err) return callback(err);
                    parts.push(link.text); // add raw text at the end, lower score in lucene?
                    //ndx(linkUrl,at.toString(),parts.join(" <> ")); // does this break apart tokenization?
                    indexQueue.push({url:linkUrl, "at":at.toString(), txt:parts.join(" <> ")});
                }
            );
        }
    );
}

var indexQueue = async.queue(function(task, callback) {
    ndx(task.url, task.at, task.txt, function(err, indexTime, docsReplacedCount) {
        callback();
    });
}, 1);

// raw indexing lucene wrapper
function ndx(id,at,txt,cb)
{
    var doc = new clucene.Document();
    doc.addField("at", at, EStore.STORE_YES|EIndex.INDEX_UNTOKENIZED);
    doc.addField('content', txt, EStore.STORE_NO|EIndex.INDEX_TOKENIZED);
    lucene.addDocument(id, doc, indexPath, function(err, indexTime, docsReplaced) {
        cb(err, indexTime, docsReplaced);
    });
}    

