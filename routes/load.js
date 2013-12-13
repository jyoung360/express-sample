var http = require('http');
var running = false;

var stats = {}

var trafficData = [
	{
		"tpm" : 100,
		"urlOrder" : "random",
		"duration" : 60,
		"urls" : [
			"http://www.cnn.com",
			"http://www.yahoo.com",
			"http://www.google.com"
		]
	},
	{
		"tpm" : 200,
		"urlOrder" : "random",
		"duration" : 60,
		"urls" : [
			"http://www.cnn.com",
			"http://www.yahoo.com",
			"http://www.google.com"
		]
	},
	{
		"tpm" : 300,
		"urlOrder" : "random",
		"duration" : 60,
		"urls" : [
			"http://www.cnn.com",
			"http://www.yahoo.com",
			"http://www.google.com"
		]
	}
];

function initiateSet(dataSet,url) {
	console.log(running);
	var node = dataSet();
	if(node) {
		doStuff(url,(60/node.tpm)*1000,0,node.tpm*node.duration/60,function(){
			initiateSet(dataSet);
		});
	}
}

function getDataSet(data) {
	var i = 0;
	return function() { 
		return data[i++];
	}
}

function randomUrl(urls) {
	return function () { return urls[Math.floor(Math.random()*urls.length)]; }
}

function doStuff(url,timeout,count,limit,callback) {
	if(!running) { return; }
	var testUrl = url();
	console.log("testing %j %j %j",testUrl,count,running);
	pollServer(testUrl);

	if(count < limit) {
		setTimeout(function() { doStuff(url,timeout,count+1,limit,callback); },timeout);
	}
	else {
		return callback();
	}
}
//setTimeout(pollServer, 1000);

function pollServer(url) {
	var data = '';

	http.get(url, function(res) {
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			data += chunk;
		});
		res.on('end', function(e) {
			stats[url] = stats[url]?stats[url]+1:1;
			console.log('all done %j',data.length);
		});
	}).on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});
}

exports.start = function(req, res){
	running = true;
	var urlGenerator = randomUrl(trafficData[0].urls)
	var dataSet = getDataSet(trafficData);

	initiateSet(dataSet,urlGenerator);
  	res.send("starting");
};

exports.stop = function(req, res){
	running = false;
  	res.send("%j",stats);
};

// graphite, rickshaw, and siren