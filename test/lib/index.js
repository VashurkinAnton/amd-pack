var two = require('../include/two.js');
//var $ = require('jquery');

two();

module.exports = function(){
	$('body').append('<div style="color: red;">It\'s worked!</div>');
}