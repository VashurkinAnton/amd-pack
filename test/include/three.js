var deps = {};
var _exports = function(path, module){deps[path] = module};

var module = {};
Object.defineProperty(module, 'exports', {
	get: function(){
		return _exports;
	},
	set: _exports.bind(null, '/path/to/test')
});
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], function(){factory(__Dependencies)});
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.test = factory();
  }
}(this, function () {
	console.log('module inited.');
	return function(){
		console.log('module 1.');
	}
}));

var module = {};
Object.defineProperty(module, 'exports', {
	get: function(){
		return _exports;
	},
	set: _exports.bind(null, '/path/to/test2')
});
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], function(){factory(__Dependencies)});
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.test = factory();
  }
}(this, function () {
	console.log('module 2 inited.');
	return function(){
		console.log('module 2.');
	}
}));

deps['/path/to/test']();
deps['/path/to/test2']();