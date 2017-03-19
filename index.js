/*
Skrypt parsuje aukcje Allegro i wypluwa dane w formie skondensowanej.
Używany do zbierania informacji o cenach komputerowego sprzętu retro.

(c) 2016 Rafał Frühling <rafamiga@gmail.com>

http://orfika.net 

*/

var debug = typeof v8debug === 'object';
if (!debug) {
	debug = process.argv.indexOf('debug') > -1;
}

if (debug) console.log("iii DEBUG ON");

var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');

if (debug) { console.log(process.argv); console.log(process.argv.length) }

if (process.argv.length > 2) {
    a = process.argv[2];
	if (isNaN(parseInt(a))) {
		console.log("!!! Podano błędny numer aukcji: " + a.toString());
		process.exit(2);
	}

    url = 'http://allegro.pl/show_item.php?item=' + a.toString();
} else {
	console.log("??? Podaj numer aukcji."); process.exit(1);
}

if (debug) {
	console.log("iii aukcja testowa");
	// aukcje testowe 
	// url = 'http://allegro.pl/show_item.php?item=6070607339';
	// url = 'http://allegro.pl/show_item.php?item=6271346272'; // lg
	// url = 'http://allegro.pl/show_item.php?item=6264028987'; // amiga
	// url = 'http://allegro.pl/ShowItem2.php?item=6256134914'; // spectrum stary layout
	// url = 'http://allegro.pl/ShowItem2.php?item=6258268704'; // c16 stary layout
	// url = 'http://allegro.pl/ShowItem2.php?item=6263296897'; // blad w starym; naprawiony
	// url = 'http://allegro.pl/ShowItem2.php?item=6274748221'; // cena z kosmosu, źle parsowana
}

console.log('... req ' + url);

request(url, function(error, response, html) {
    if (error) return console.error("!!! Niepowodzenie odczytu '" + url +"': ", error);
    
	// if (debug) console.log(html)
    var $ = cheerio.load(html);
	
    var aTitle, aNum, aPrice, aEnd, aBidders, aWinner, aSeller, aSellerLoc;
    console.log('... parsowanie');

    aTitle = $("meta[itemprop = 'name']").attr('content');
    aNum = $("meta[itemprop = 'sku']").attr('content');

	if (debug) { console.log("aNum=" + aNum + " (" + typeof(aNum) + ") a=" + a + " ("+ typeof(a) + ")"); }
	
	if (!debug && a != aNum) {
		console.log ("!!! Aukcja niedostępna, tj. za stara albo podano nieprawidłowy numer");
		process.exit(3);
	}

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
        aPrice = visitDataParsed.bidPrice.replace(/\s/g,"");
        if (debug) console.log("parsed a="+aNum+" "+aTitle+" bidPrice="+aPrice);

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
        // stary layout, ten na ramkach
        console.log("iii STARY layout");
            
        aPrice = $("#itemFinishBox2").find(".left").find('strong').first().text().replace(/\s/g,"");

        aEnd = $(".timeInfo").text(); // "<strong>Zakończona</strong> (18 czerwca, 17:15:15)"
        aEnd = aEnd.substring(aEnd.indexOf("(")+1,aEnd.indexOf(")")-1); // data w nawiasach
        aEnd = aEnd.substring(0,aEnd.indexOf(",")); // usuwanie przecinka

        var aDay = parseInt(aEnd.substring(0,aEnd.indexOf(" ")));
        
        var dMons = ["stycznia","lutego","marca","kwietnia","maja","czerwca",
            "lipca","sierpnia","września","października","listopada","grudnia"];
        var dParsuj = aEnd.split(" ");
        if (debug) console.log("dparsuj[1]="+dParsuj[1]);
        var dMon = dMons.indexOf(dParsuj[1].toLowerCase())+1;
        if (debug) console.log("dparsuj="+dParsuj[0]+"/"+dMon);

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
    
    if (debug) console.log("aEnd="+aEnd);
    aEnd = Date.parse(aEnd);
    aDate = new Date(aEnd);
    if (debug) console.log("aDate="+aDate.toString());
    aEnd = aDate.getFullYear()+"-";

    // proste formatowanie daty (format ISO) bez importowania modułów 
    var m = aDate.getMonth();
    var d = aDate.getDate();
    if (m < 10) aEnd += "0"
    aEnd += m.toString()+"-";
    if (d < 10) aEnd += "0"
    aEnd += d.toString();
    
    console.log(aTitle + " (" + aNum + ") " + aPrice + " " + aEnd + " " +
        aBidders + " " + aWinner + "; " + aSeller + ", " + aSellerLoc);
})
