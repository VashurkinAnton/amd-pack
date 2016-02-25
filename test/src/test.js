(function (root, factory, getModules) {
    var refreshSocket = new WebSocket("ws://" + window.location.hostname + ':8721');
	refreshSocket.onmessage = function(){	window.location.reload(); };
	
	var __Dependencies = getModules();
	var require = function(name){
		return __Dependencies[name];
	}
    if (typeof define === 'function' && define.amd) {
        define([], function(){factory(require)});
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(require);
    } else {
        root.undefined = factory(require);
  }
}(this, function (require) {
	var two = require('/amd-pack/test/include/two.js');
	//var $ = require('jquery');
	two();
	return  function(){
		$('body').append('<div style="color: red;">It\'s worked!</div>');
	}
}, function(){
	var __Dependencies = {};
	var require = function(name){
		return __Dependencies[name];
	}
	var _exports = function(path, module){__Dependencies[path] = module};
	//Module file: /amd-pack/test/include/one.js
	(function(){
		var module = {};
		Object.defineProperty(module, 'exports', {
			get: function(){
				return {};
			},
			set: _exports.bind(null, '/amd-pack/test/include/one.js')
		});
		module.exports = function(){
			console.log('one');
		}
	}());
	//Module file: /amd-pack/test/include/two.js
	(function(){
		var module = {};
		Object.defineProperty(module, 'exports', {
			get: function(){
				return {};
			},
			set: _exports.bind(null, '/amd-pack/test/include/two.js')
		});
		var one = require('/amd-pack/test/include/one.js');
		module.exports = function(){
			one();
			console.log('two');
		}
	}());
	return __Dependencies;
}));