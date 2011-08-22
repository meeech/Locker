// expand an URL
var unshortener = require('unshortener');

     // you can pass in a url object or string
     unshortener.expand('http://t.co/rWP6BP3',
                        function (url) {
                             // url is a url object
                             console.log(url);
                        });


exports.expandLink = function(arg, cbEach, cbDone) {
    if(!arg.url) return cbDone("no url");
    unshortener.expand(arg.url, function(url){
        cbEach(url);
        cbDone();
    });
}

/*

extractLinks - text
    normalizes and returns array
    
extractText - url
    returns title and text

expandLink - url
    returns expanded

*/