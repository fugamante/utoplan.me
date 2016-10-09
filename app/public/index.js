var request = require('request');

var options = {
  url: 'http://api.census.gov/data/2014/acs5?',
  headers: {
    'User-Agent': 'request'
  }
};

function callback(error, response, body) {
  if (!error && response.statusCode == 200) {
    var info = JSON.parse(body);
    console.log(info.dataset);
  }
}

request(options, callback);