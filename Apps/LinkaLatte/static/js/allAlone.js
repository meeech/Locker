var collectionHandle = "";
var resultsTemplate = null;

function queryLinksCollection (queryString) {
    console.log("Querying: " + $.param({q:queryString||""}));
    $(".dateGroup").remove();
    var url = "/Me/" + collectionHandle + "/search?" + queryString;
    if (!queryString) url = "/Me/" + collectionHandle + "/getLinksFull";
    $.ajax({
      "url": url,
      type: "GET",
      dataType: "json",
      success: function(data) {
        //called when successful
        $("#results").show();
        // First we sort it by the at field then we're going to group it by date
        data.sort(function(lh, rh) {
            return lh.at < rh.at;
        });
        var dateGroups = []; // Array of objectcs matching {date:..., links:[...]}
        var curDate = null;
        var curLinks;
        for (var i = 0; i < data.length; ++i) {
            // We unset all the non compared fields
            var nextDate = new Date;
            nextDate.setTime(parseInt(data[i].at) * 1000);
            nextDate.setHours(0);
            nextDate.setMinutes(0);
            nextDate.setSeconds(0);
            nextDate.setMilliseconds(0);
            
            // If it's a different date let's start a new group of links
            if (!curDate || nextDate.getTime() != curDate.getTime()) {
                var newDateGroup = {date:nextDate.strftime("%A, %B %d, %Y"), links:[]};
                dateGroups.push(newDateGroup);
                curLinks = newDateGroup.links;
                curDate = nextDate;
            }
            
            curLinks.push(data[i]);
        }
        $("#results").render({groups:dateGroups,groupClass:"dateGroup"}, resultsTemplate);
        $("#results").show();
      },
      error: function() {
        //called when there is an error
      },
    });
    
}
function findLinksCollection()
{
    console.log("Finding the collection");
    $.ajax({
      url: "/providers?types=link",
      type: "GET",
      dataType: "json",    
      success: function(data) {
          for (var i = 0; i < data.length; ++i) {
              if (data[i].provides.indexOf("link") > -1 && data[i].is === "collection") {
                  collectionHandle = data[i].id;
                  $("#loading").hide();
                  $("header").show();
                  break;
              }
          }
          // If we couldn't find a collection bail out
          if (collectionHandle === "") {
              showError("Could not find a valid links Collection to display.  Please contact your system administrator.");
              return;
          }
          queryLinksCollection();
      },
      error: function() {
          showError("Could not find a valid links Collection to display.  Please contact your system administrator.");
      },
    });
    
}
function showError(errorMessage)
{
    $("#errorMsg").text(errorMessage);
    $("#errorMsg").show();
    $("#results").hide();
    $("#loading").hide();
}

$(function(){
    resultsTemplate = $p("#results").compile({
        "div.templateDateGroup" : {
            "group<-groups" : {
                "@class":"groupClass",
                "div.dateInfo":"group.date",
                "div.linkInfo" : {
                    "link<-group.links": {
                        "img.providerIcon@src":function(arg, item) {
                            var images = {
                                "facebook":"img/facebook.png",
                                "twitter":"img/twitter.png"
                            };
                            return images[arg.item.encounters[0].network];
                        },
                        "div.fullInfo@class+":function(arg) {
                            return arg.pos % 2 == 0 ? " even" : " odd";
                        },
                        "img.favicon@src":"link.favicon",
                        "a":"link.link",
                        "a@href":"link.link",
                        "div.linkDescription":"link.title"
                    }
                }
            }
        }
    });
    findLinksCollection();
    $("#searchLinks").click(function(){
        queryLinksCollection($("#linksQuery").val());
    });
})