# AMD-PACK. No setting files only one command!

Quick build your app into AMD library, while retaining all the dependencies. Automatic building and rebooting the client. 

# Installation
```
npm install amd-pack -g
```
# Using:

## Windows with powershell
```
amd-pack.cmd [options]
```
## *nix systems
```
amd-pack [options]
```
# Options

## -i or --input <path>
```
	amd-pack -i ./path/to/root/file.js
```
## -o or --output <path>
```
	amd-pack -o ./path/to/builded/module.js
```
## -n or --name <moduleName>
```
	amd-pack -n myCoolAMDModule
```
## -m or --minify
```
	amd-pack -m // minify builded file (used uglify minifer).		
```
## -w or --watch
```
	amd-pack -w //watch all dependences in you module and rebuild if some file chenged.
```
## --ws
```
	amd-pack --ws //reload client after rebuild, worked only with --watch(or -w).
```
## --help
```
	amd-pack --ws // show all options
```

# Including files in project
```
	// @arguments: pathToFile <string>, wrapperType <string>
	var file = amdPack.include('./file.md', 'string');
	console.log(file);
```
## wrappers for included files

### string

Include file like string.

### function

Include file like function.

# Builders

```
	var builder = require('amd-pack');
	builder({
		input: './dist/component.jsx',
		output: './src/Slider.js',
		name: 'Slider',
		builders: [
			{
				ext: 'less',
				action: 'loading',
				handler: function(source, next){
					setTimeout(function(){
						console.log('Less');
						next(source);
					}, 10);
				}
			},
			{
				ext: 'jsx?',
				action: 'loading',
				handler: function(source, next){
					console.log('JSX');
					next(source);
				}
			},
			{
				action: 'packing',
				handler: function(source, next){
					console.log('packing');
					next(source);
				}
			}
		]
	});
```
## Skip options
For skiping some file you need added RegExp string for some path.
```
	var builder = require('amd-pack');
	builder({
		input: './dist/component.jsx',
		output: './src/Slider.js',
		name: 'Slider',
		skip: ['node_modules'], // skip all files from node_modules
		builders: [
			{
				ext: 'less',
				action: 'loading',
				skip: ['slider-skins\\.less'] // skip all "slider-skins.less" in this builder
				handler: function(source, next){
					setTimeout(function(){
						console.log('Less');
						next(source);
					}, 10);
				}
			},
			{
				ext: 'jsx?',
				action: 'loading',
				handler: function(source, next){
					console.log('JSX');
					next(source);
				}
			},
			{
				'action': 'packing',
				handler: function(source, next){
					console.log('packing');
					next(source);
				}
			}
		]
	});
```

# Importantly!

Commented out modules will not be added to the project!
Modules loaded from node_modules will be fully added to the file, except for native modules!

# Demo project

## The structure of the project

```
	|_ include
	|	      |_ one.js
	|		  |_ two.js
	|		  |_ three.js
	|		
	|_ lib
	|	  |_ index.js
	|	  |_ sub.js
	|
	|_ src
	|	  |_ index.html
	|
	|_ server.js
```

## Starting the test server
```
	node ./server.js
```
## Starting packer
	
### Short syntax without minification
```		
	amd-pack -i ./lib/index.js -o ./src/test.js -n testModule -w --ws
```
### The full syntax without minification
```
	amd-pack -input ./lib/index.js -output ./src/test.js -name testModule -watch --ws
```
### Short syntax with minification
```		
	amd-pack -i ./lib/index.js -o ./src/test.js -n testModule -w --ws -m
```
### The full syntax with minification
```
	amd-pack -input ./lib/index.js -output ./src/test.js -name testModule -watch --ws --minify
```
## The result of the compilation without minification:
```
(function (root, factory, getModules) {
	
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
```

# License MIT 
Anton Vashurkin <cronosfera2@gmail.com>. (c) 2016.