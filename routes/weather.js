var express = require('express');
var request = require('request');
var convert = require('xml-js');
let redis = require('redis');
let fs = require('fs');

var router = express.Router();
let redis_client = redis.createClient();

/////////////////// redis ///////////////////
redis_client.on("error", function (err) {
	console.log("Redis Error " + err);
});

let file = fs.readFileSync('./apikeys.json');
let apikeys = JSON.parse(file);
console.log(apikeys);
let ServiceKey = apikeys.weather.ServiceKey;

/* GET users listing. */
router.get('/', function (req, res, next) {

	let today = new Date();
	let mm = today.getMonth() + 1;
	if (mm < 10) mm = '0' + mm;
	let dd = today.getDate();
	if (dd < 10) dd = '0' + dd;
	var base_date = today.getFullYear().toString() + mm + dd;
	//console.log('base_date: ' + base_date);
	var base_time = '0500';
	// Seoul Seocho-gu Seocho 1dong coordinates
	var nx = 61;
	var ny = 125;
	var numOfRow = 10;
	var pageNo = 1;
	var _type = 'xml';

	let cache_key = 'weather:' + base_date + base_time + nx + ny;
	console.log('cache_key: ' + cache_key);
	redis_client.get(cache_key, function(err, reply){
		if (reply){
			console.log("cached");
			res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
			res.end(reply);
		} else {
			console.log("not cached");
			var api_url =
				`http://newsky2.kma.go.kr/service/SecndSrtpdFrcstInfoService2/ForecastSpaceData?ServiceKey=${ServiceKey}&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}&numOfRow=${numOfRow}&pageNo=${pageNo}&_type=${_type}`;

			var options = {
				url: api_url,
				//headers: {}
			};

			request.get(options, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var result = convert.xml2json(body, { compact: true, spaces: 4 });
					redis_client.set(cache_key, result);
					redis_client.expire(cache_key, 10);

					res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
					res.end(result);
				} else {
					res.status(response.statusCode).end();
					console.log('error = ' + response.statusCode);
				}
			});
		}
	});

	

});

module.exports = router;
