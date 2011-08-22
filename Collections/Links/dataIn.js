/*

reindex
    crawl places

process object, mapEncounter?

is fb link info bundled?
twitter link bundle?

*/

function getEncounterFB(post)
{
    
}

function getEncounterTwitter(tweet, cb)
{
    var e = {id:tweet.id
        , network:"twitter"
        , text: tweet.text
        , from: tweet.user.name
        , fromID: tweet.user.id
        , at: new Date(tweet.created_at).getTime()
        }
}