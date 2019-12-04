var express = require('express');
var request = require('request');
let redis = require('redis');
let fs = require('fs');

var router = express.Router();
let redis_client = redis.createClient();

/////////////// redis /////////////////
redis_client.on("error", function (err) {
	console.log("Redis Error " + err);
});


let file = fs.readFileSync('./apikeys.json');
let apikeys = JSON.parse(file);
console.log(apikeys);
let apiKey = apikeys.kakao.apiKey;

/* GET users listing. */
router.get('/', function (req, res, next) {
	console.log('query: ' + req.query.query);

	let cache_key = 'kakao_search:' + req.query.query;
	console.log('cache_key: ' + cache_key);
	redis_client.get(cache_key, function(err, reply){
		if (reply){
			console.log("cached");
			res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
			res.end(reply);
		} else {
			console.log("not cached");
			var api_url = 'https://dapi.kakao.com/v2/search/web?query=' + encodeURI(req.query.query);

			var options = {
				url: api_url,
				headers: { 'Authorization': 'KakaoAK ' + apiKey }
			};

			request.get(options, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					console.log(typeof body);
					redis_client.set(cache_key, body);
					redis_client.expire(cache_key, 10);
					
					res.writeHead(200, { 'Content-Type': 'text/json;charset=utf-8' });
					res.end(body);
				} else {
					res.status(response.statusCode).end();
					console.log('error = ' + response.statusCode);
				}
			});
		}
	});
	

});

module.exports = router;
