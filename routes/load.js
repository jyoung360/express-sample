var http = require('http');
var running = false;
var startTime = undefined;
var endTime;
var aborted = false;

var stats = {}

var trafficData = [];

function initiateSet(dataSet,url) {
	var node = dataSet();
	if(node) {
		url = randomUrl(node.urls);
		processDataSet(url,(60/node.tpm)*1000,0,node.tpm*node.duration/60,function(){
			initiateSet(dataSet);
		});
	}
	else {
		console.log('Completed all tests.')
		running=false;
		endTime = new Date();
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

function processDataSet(url,timeout,count,limit,callback) {
	if(!running) { return; }
	var testUrl = url();
	runTest(testUrl);

	if(count < limit) {
		setTimeout(function() { processDataSet(url,timeout,count+1,limit,callback); },timeout);
	}
	else {
		return callback();
	}
}

function runTest(url) {
	var data = '';

	http.get(url, function(res) {
		var start = new Date();
		res.setEncoding('utf8');
		
		res.on('data', function (chunk) {
			data += chunk;
		});
		res.on('end', function(e) {
			var end = new Date();
			var duration = end-start;
			console.log("Received response from server after %j ms with status code %j",duration,res.statusCode);
			var existingStats = stats[url] || { "statusCodes" : [], "responseTimes" : [] };
			existingStats.statusCodes.push(res.statusCode);
			existingStats.responseTimes.push(duration);
			stats[url] = existingStats;
		});
	}).on('error', function(e) {
		console.log("Received error from server w/ message: %j",e.message);
	});
}

function inspectJson(json) {
	var response = {
		"success" : false,
		"message" : "N/A"
	};
	try {
		trafficData = JSON.parse(json);
		response.success = true;
	}catch(Exception) {
		console.log(Exception.message);
		response.message = Exception.message;
	}
	return response;
}

exports.start = function(req, res){
	var status = inspectJson(req.body.json);
	if(status.success !== true) {
		console.log(status);
		res.send(status.message);
		return;
	}

	running = true;
	var urlGenerator = randomUrl(trafficData[0].urls)
	var dataSet = getDataSet(trafficData);

	initiateSet(dataSet);
	startTime = new Date();
  	res.send("starting");
};

exports.stop = function(req, res){
	running = false;
	endTime = new Date();
	aborted = true;
  	res.send("%j",stats);
};

exports.status = function(req, res) {
	var response = {
		"complete" : !running,
		"data" : stats,
		"startTime" : startTime,
		"endTime" : endTime,
		"aborted" : aborted
	}
	res.json(response);
}
