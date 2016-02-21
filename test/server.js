var path = require('path');

var express = require('express');
var server = express();

server.use(express.static(path.resolve('./src')));

server.listen(8080);
console.log('Test server stated on 8080');