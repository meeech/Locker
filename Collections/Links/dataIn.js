var request = require('request');
var util = require('./util');
var async = require('async');
var logger = require(__dirname + "/../../Common/node/logger").logger;

var dataStore, locker, search;
// internally we need these for happy fun stuff
exports.init = function(l, dStore, s){
    dataStore = dStore;
    locker = l;
    search = s;
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
function getLinks(getter, lurl, callback) {
    request.get({uri:lurl}, function(err, resp, body) {
        var arr;
        try{
            arr = JSON.parse(body);            
        }catch(E){
            return callback();
        }
        for(var i=0; i < arr.length; i++)
        {
            var e = getter(arr[i]);
            if(!e.text) continue;
            processEncounter(e,function(err){if(err) console.log("getLinks error:"+err)});
        }
    });
}

// do all the dirty work to store a new encounter
function processEncounter(e, callback)
{
    var urls = [];
logger.debug("processing encounter: "+JSON.stringify(e));
    // extract all links
    util.extractUrls({text:e.text},function(u){urls.push(u)},function(err){
        if(err) return callback(err);
        // for each one, run linkMagic on em
        if (urls.length === 0) return callback();
        async.forEach(urls,function(u,cb){
            linkMagic(u,function(link){
                e.orig = u;
                e.link = link;
                dataStore.addEncounter(e,function(err){
                    if(err) return cb(err);
                    search.index(link,cb)
                }); // once resolved, store the encounter
                
            });
        },callback);
    });
}

// given a raw url, result in a fully stored qualified link (cb's full link url)
function linkMagic(origUrl, callback){
    // check if the orig url is in any encounter already (that has a full link url)
    dataStore.checkUrl(origUrl,function(linkUrl){
        if(linkUrl) return callback(linkUrl); // short circuit!
        // new one, expand it to a full one
        util.expandUrl({url:origUrl},function(u){linkUrl=u},function(){
           // fallback use orig if errrrr
           if(!linkUrl) {
               linkUrl = origUrl;
            }
           var link = false;
           // does this full one already have a link stored?
           dataStore.getLinks({url:linkUrl},function(l){link=l},function(err){
              if(link) {
                  return callback(link.link); // yeah short circuit dos!
              }
              // new link!!!
              link = {link:linkUrl};
              util.fetchHTML({url:linkUrl},function(html){link.html = html},function(){
                  util.extractText(link,function(rtxt){link.title=rtxt.title;link.text = rtxt.text},function(){
                      util.extractFavicon({url:linkUrl,html:link.html},function(fav){link.favicon=fav},function(){
                          // *pfew*, callback nausea, sometimes I wonder...
                          delete link.html; // don't want that stored
                          dataStore.addLink(link,function(){
                              callback(link.link); // TODO: handle when it didn't get stored or is empty better, if even needed
                          });
                      });
                  });
              });
           });
        });
    });
}

function getEncounterFB(post)
{
    var e = {id:post.id
        , network:"facebook"
        , text: post.message
        , from: post.from.name
        , fromID: post.from.id
        , at: post.created_time
        , via: post
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
        , via: tweet
        };
    return e;
}
