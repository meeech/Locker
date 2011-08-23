
var url = require('url');
var unshortener = require('unshortener');
var sax =  require("sax");
var readability = require("readabilitySAX");
var request = require('request');
var logger = require(__dirname + "/../../Common/node/logger").logger;

// simply expand a given url
exports.expandUrl = function(url, cbEach, cbDone) {
    if(!url) return cbDone("no url");
    unshortener.expand(url, function(u){
        cbEach(u);
        cbDone();
    });
}

// find/iterate through all possible urls in any random text
exports.extractUrls = function(arg, cbEach, cbDone) {
    if(!arg.text) return cbDone("no text");
    var regexToken = /((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/g;

    // when you use /g on a regex it magically maintains state between .exec() calls, CRAZY TIMES!
    while( (matchArray = regexToken.exec( arg.text )) !== null )
    {
        var str = matchArray[0];
        // gotta do sanity cleanup for url.parse, it makes no assumptions I guess :/
        if(str.substr(0,4).toLowerCase() != "http") str = "http://"+str;
        var u = url.parse(str);
        if(!u) continue;
        cbEach(u);
    }
    cbDone();
}

// take the html of a page and extract the title and text
exports.extractText = function(arg, cbEach, cbDone) {
    if(!arg.html) return cbDone("no html");

	var contentLength = 0, skipLevel = 0, 
		parser, readable, ret;

	// keep skipping unless/until we have a decent amount of text
	while(contentLength < 250 && skipLevel < 4){
	    parser = sax.parser(false, {
		    lowercasetags : true
		});
	    
	    readable = new readability.process(parser, {skipLevel:skipLevel});
	    
	    parser.write(arg.html).close();
	    
	    ret = readable.getArticle("text");
	    contentLength = ret.textLength;
	    skipLevel += 1;
	}
	
	if(ret)
	{
	    // normalize all whitespace nicely
	    ret.text = ret.text.replace(/\s+/g, ' ');
    	cbEach(ret);
	}
	cbDone();
}

// take the html of a page and determine the favicon
exports.extractFavicon = function(arg, cbEach, cbDone) {
    if(!arg.url) return cbDone("no url");
    // TODO: use regex to look for it in arg.html:
    // /<link.*?href=("|\')(.*?)("|\').*?rel=("|\').*icon("|\')/i
    // /<link.*?rel=("|\').*icon("|\').*?href=("|\')(.*?)("|\')/i
    var u = url.parse(arg.url);
    cbEach(url.resolve(u,"/favicon.ico"));
    cbDone();
}

// handy wrapper
exports.fetchHTML = function(arg, cbEach, cbDone) {
    if(!arg.url) return cbDone("no url");
    // TODO: should accept-only html here, and check response validity
    request.get({uri:arg.url},function(err,resp,body){
	   if(err) return cbDone(err);
	    cbEach(body);
	    cbDone();
	});
	
}

