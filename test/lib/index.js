var two = require('../include/two.js');
var $ = require('jquery');

two();
$('body').append('<div>It\'s worked!</div>');

module.exports = function(){
	console.log('Test module.');
}