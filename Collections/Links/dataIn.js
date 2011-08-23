var request = require('request');

var dataStore, locker;
// internally we need these for happy fun stuff
exports.init = function(l, dStore){
    dataStore = dStore;
    locker = l;
}

// manually walk and reindex all possible link sources
exports.reIndex = function(locker) {
    locker.providers(['link/facebook', 'status/twitter'], function(err, services) {
        if (!services) return;
        services.forEach(function(svc) {
            if(svc.provides.indexOf('link/facebook') >= 0) {
                getLinks(getEncounterFB, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/newsfeed?limit=10', function() {
                    getLinks(getEncounterFB, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/wall?limit=10', function() {
                        console.error('facebook done!');
                    });
                });
            } else if(svc.provides.indexOf('status/twitter') >= 0) {
                getLinks(getEncounterTwitter, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/home_timeline?limit=10', function() {
                    console.error('twitter done!');
                });
            }
        });
    });
}

// handle incoming events individually
exports.processEvent = function(event)
{
    // TODO check event type and extract proper encounter
}

// used by reIndex to fetch and process each service
function getLinks(getter, url, callback) {
    request.get({uri:url}, function(err, resp, body) {
        var arr;
        try{
            arr = JSON.parse(body);            
        }catch(E){
            return callback();
        }
        for(var i=0; i < arr.length; i++)
        {
            var e = getter(arr[i]);
            console.log(JSON.stringify(e));
        }
    });
}

// do all the dirty work to store a new encounter
function processEncounter(e, callback){
    // extract all links
    // run linkMagic on them
    // for each link, store an encounter... (storing one encounter w/ arrays of links in it seems weird?)
}

// given a raw url, result in a fully stored qualified link
function linkMagic(origUrl, callback){
    // ds.checkUrl first, short circuit
    // failing that, unshorten
    // that's our linkUrl, now ds.getLinks it
    // failing that, fetch it, extact text/favicon, and store
    // return final link url
}

function getEncounterFB(post)
{
    var e = {id:post.id
        , network:"facebook"
        , text: post.message
        , from: post.from.name
        , fromID: post.from.id
        , at: post.created_time
        };
    return e;
}

function getEncounterTwitter(tweet)
{
    var e = {id:tweet.id
        , network:"twitter"
        , text: tweet.text
        , from: tweet.user.name
        , fromID: tweet.user.id
        , at: new Date(tweet.created_at).getTime()
        };
    return e;
}
