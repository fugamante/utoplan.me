var express = require('express');
var app = express();
var port = process.env.PORT || 8080;

app.use(function(req, res, next) {
  // Express 3 static middleware can crash on modern Node when cache validators
  // trigger its legacy freshness check.
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];
  next();
});

app.use(express.static(__dirname + '/public'));

app.listen(port, function(){
  console.log('app listening on port ' + port);
});
