/*

reindex
    crawl places

process object, mapEncounter?

is fb link info bundled?
twitter link bundle?

*/

exports.reIndex = function(locker) {
    locker.providers(['link/facebook', 'status/twitter'], function(err, services) {
        if (!services) return;
        services.forEach(function(svc) {
            if(svc.provides.indexOf('link/facebook') >= 0) {
                exports.getLinks("facebook", "newsfeed", svc.id, function() {
                    exports.getLinks("facebook", "wall", svc.id, function() {
                        console.error('facebook done!');
                    });
                });
            } else if(svc.provides.indexOf('status/twitter') >= 0) {
                exports.getLinks("twitter", "home_timeline", svc.id, function() {
                    console.error('twitter done!');
                });
            }
        });
    });
}


exports.getLinks = function(type, endpoint, svcID, callback) {
    request.get({uri:lconfig.lockerBase + '/Me/' + svcID + '/getCurrent/' + endpoint}, function(err, resp, body) {
        var arr;
        try{
            arr = JSON.parse(body);            
        }catch(E){
            return callback();
        }
        processData(svcID, type, endpoint, arr, callback)
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