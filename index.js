/*
Skrypt parsuje aukcje Allegro i wypluwa dane w formie skondensowanej.
Używany do zbierania informacji o cenach komputerowego sprzętu retro.

(c) 2016 Rafał Frühling <rafamiga@gmail.com>

http://orfika.net 

*/

var debug = typeof v8debug === 'object';
debug = process.argv.indexOf('debug') > -1;

if (debug) console.log("!!! DEBUG ON");

var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');

// process.exit(255);
        
// testowe 
url = 'http://allegro.pl/show_item.php?item=6070607339';
url = 'http://allegro.pl/show_item.php?item=6271346272'; // lg
url = 'http://allegro.pl/show_item.php?item=6264028987'; // amiga
url = 'http://allegro.pl/ShowItem2.php?item=6256134914'; // spectrum stary layout
//url = 'http://allegro.pl/ShowItem2.php?item=6258268704'; // c16 stary layout
url = 'http://allegro.pl/ShowItem2.php?item=6263296897'; // blad w starym

console.log(process.argv) && debug;

if (process.argv.length == 3 && ! debug) {
    a = process.argv.slice(2);
    url = 'http://allegro.pl/show_item.php?item=' + a.toString();
} else { console.log("??? Jaki nr aukcji?"); process.exit(1); }

console.log('... req ' + url);

request(url, function(error, response, html) {
    if (error) return console.error("Niepowodzenie odczytu '" + url +"': ", err);
    
    var $ = cheerio.load(html);

    // Finally, we'll define the variables we're going to capture

    var aTitle, aNum, aPrice, aEnd, aBidders, aWinner, aSeller, aSellerLoc;
    console.log('... parsowanie');

    aTitle = $("meta[itemprop = 'name']").attr('content');
    aNum = $("meta[itemprop = 'sku']").attr('content');

    if (debug) console.log("meta itemprop name="+$("meta[itemprop = 'name']").attr('content'));
	if (debug) console.log("sku="+$("meta[itemprop = 'sku']").attr('content'));

    var visitData = $("div.showitem-main").attr('data-visit');

    if (typeof visitData !== typeof undefined) {
        // nowy layout
        console.log("iii NOWY layout");

//        console.log("data-visit="+visitData);
        var visitDataParsed = JSON.parse(visitData);
            
        aNum = visitDataParsed.id;
        aTitle = visitDataParsed.name;
        aPrice = visitDataParsed.bidPrice;
//        console.log("parsed="+aNum+" "+aTitle+" "+aPrice);

        aEnd = $("#time-info").find('time').attr('datetime');

        aWinner = $("#history").find('.body').find('div').first().text();
//        console.log("aWinner="+aWinner);
        aBidders = $(".bidders-list").find('.body').length;
//        console.log("aBidders="+aBidders);

        aSeller = $("#seller-details").find(".alleLink").find('span').first().text();
//        console.log("aSeller="+aSeller);
        aSellerLoc = $("#showitem-main").find(".list-unstyled").find('li').find('strong').first().text();
//        console.log("aSellerLoc="+aSellerLoc);
        
    } else {

        // stary layout. na ramkach
        console.log("iii STARY layout");
            
        aPrice = $("#itemFinishBox2").find(".left").find('strong').first().text();

        aEnd = $(".timeInfo").text(); // "<strong>Zakończona</strong> (18 czerwca, 17:15:15)"
        aEnd = aEnd.substring(aEnd.indexOf("(")+1,aEnd.indexOf(")")-1); // data w nawiasach
        aEnd = aEnd.substring(0,aEnd.indexOf(",")); // usuwanie przecinka
        console.log("aEnd="+aEnd) && debug;

        var aDay = parseInt(aEnd.substring(0,aEnd.indexOf(" ")));
        
        var dMons = ["stycznia","lutego","marca","kwietnia","maja","czerwca",
            "lipca","sierpnia","września","października","listopada","grudnia"];
        var dParsuj = aEnd.split(" ");
        console.log("dparsuj[1]="+dParsuj[1]) && debug;
        var dMon = dMons.indexOf(dParsuj[1].toLowerCase())+1;
        console.log("dparsuj="+dParsuj[0]+"/"+dMon) && debug;

        dD = new Date();
        dY = dD.getFullYear();

        // czy mamy już nowy rok?
        if (dMon < dD.getMonth()) dY = dY - 1;
        aEnd=dY+"-"+("00" + dMon.toString()).slice(-2)+"-"+("00" + aDay.toString()).slice(-2);
//        console.log("aEnd="+aEnd);

        aWinner = $("#history").find('tbody').find('tr').first().find('.uname').find('a').text();
//        console.log("aWinner="+aWinner);
        aBidders = $('.bidHistoryList').find('.uname').length;
//        console.log("aBidders="+aBidders);

        aSeller = $(".sellerDetails").find('dt').first().text().trim();
        aSeller = aSeller.substring(aSeller.indexOf(" ")+1,aSeller.indexOf("(")).trim();
//        console.log("aSeller="+aSeller);
        var aSellerLoc = $('#paymentShipment').find(".small").last().find('strong').text();
        console.log("aaSellerLoc="+aSellerLoc);
        
    }


    aPrice = parseFloat(aPrice.replace(/[^0-9],\./g, '').replace(',','.')).toFixed(2).toString().replace('.',',');
    console.log('aPrice='+aPrice) && debug;

    aEnd = Date.parse(aEnd);
    aDate = new Date(aEnd);
    aEnd = aDate.toLocaleDateString();

    console.log(aTitle + " (" + aNum + ") " + aPrice + " " + aEnd + " " +
        aBidders + " " + aWinner + "; " + aSeller + ", " + aSellerLoc);
})
