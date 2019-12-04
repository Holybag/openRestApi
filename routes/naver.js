var express = require('express');
var convert = require('xml-js');
var request = require('request');
var redis = require('redis');
let fs = require('fs');

var router = express.Router();
let redis_client = redis.createClient();

/////////////////// redis ///////////////////
redis_client.on("error", function(err){
	console.log("Redis Error " + err);
});


let file = fs.readFileSync('./apikeys.json');
let apikeys = JSON.parse(file);
console.log(apikeys);
let client_id = apikeys.naver.client_id;
let client_secret = apikeys.naver.client_secret;

/* GET users listing. */
router.get('/', function(req, res, next) {
	console.log('query: ' + req.query.query);
	
	let cache_key = 'naver_search:' + req.query.query;
	console.log('cache_key: ' + cache_key);
	redis_client.get(cache_key, function(err, reply){
		if (reply){
			console.log("cached");
			res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
			res.end(reply);
		} else {
			console.log("not cached");
			var api_url = 'https://openapi.naver.com/v1/search/blog.xml?query=' + encodeURI(req.query.query);
			var options = {
				url: api_url,
				headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
			};
			request.get(options, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					
					var result = convert.xml2json(body, {compact: true, spaces: 4});
					redis_client.set(cache_key, result);
					redis_client.expire(cache_key, 10);
					
					res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
					res.end(result);
				} else {
					res.status(response.statusCode).end();
					console.log('request error = ' + response.statusCode);
				}
			});
		}
	});
});

module.exports = router;
