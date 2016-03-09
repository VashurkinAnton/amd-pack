var fs = require('fs');
var path = require('path');
var uglify = require('uglify-js');
var async = require('async');

module.exports = function(){ // wrapping
	var wss;
	var port;
	var loadedFiles = {};
	var watchedFiles = {};
	var deps = [];
	var rootDir = path.dirname(__filename);
	var wsInjection = fs.readFileSync(path.resolve(rootDir, "./ws-injection.js"), 'utf-8');

	var includeModifers = {
		string: function(source){
			return 'module.exports = "'+source.replace(/[\"\n\r]/ig, function(ch){
				if(ch === '\"'){
					return '\\"';
				}else{
					return '\\n';
				}
			})+'";';
		},
		function: function(source){
			return 'module.exports = function(){ \n\t'+source+'};';
		},
		file: function(source){
			return source;
		}
	}

	function TestString(testString){
		var tests = [];
		var testStringLength = testString.length;
		for(var i = 1, len = testStringLength + 1; i < len; i++){
			tests.push('\t\t' + i + ':' + '"' + testString.substring(0, i) + '"');
		}
		var source = [
			'\tvar test = {',
				tests.join(',\n'),
			'\t};',
			'\tvar len = str.length;',
			'\tvar result = test[len] === str;',
			'\tvar isFull = result ? ' + testStringLength + ' === len : false ;',
			'\treturn {test: result, full: isFull};'
		];
		
		return Function('str', source.join('\n'));
	}
	var isRequire = TestString('require');
	var isAmdPack = TestString('amdPack.include');

	var isWhiteSpace = {
		'\n': 1,
		'\r': 1,
		'\t': 1,
		'\b': 1,
		' ': 1,
		'\v': 1,
		'\f': 1
	};
	function skipWhiteSpaces(source, cursor){
		var ch;
		while(ch = source[cursor]){
			if(!isWhiteSpace[ch]){
				break;
			}
			cursor += 1;
		}
		return cursor;
	}
	function skipString(source, cursor, removeQuotes){
		var isString = true, ch;
		var quote = source[cursor];
		var string = '';

		cursor += 1;
		while(isString && (ch = source[cursor])){
			if(ch === quote){
				isString = false;
				if(removeQuotes){
					ch = '';
				}
			}else if(ch === '\\'){
				string += '\\';
				cursor += 1;
			}
			string += ch;
			cursor += 1;
		}
		if(removeQuotes){
			return {cursor: cursor, string: string};
		}else{
			return {cursor: cursor, string: quote + string};
		}
	}
	function skipComment(source, cursor){
		var ch, type = source[cursor + 1] === '/' ? false : true;
		cursor += 2;
		while(ch = source[cursor]){
			if(type){
				if(ch === '*' && source[cursor + 1] === '/'){
					cursor += 2;
					break;	
				}
			}else if(ch === '\n'){
				cursor += 1;
				break;
			}
			cursor += 1;
		}
		return cursor;
	}
	function getPath(source, cursor){
		var path = null;
		cursor = skipWhiteSpaces(source, cursor);
		if(source[cursor] === '('){
			cursor = skipWhiteSpaces(source, cursor + 1);
			if(source[cursor] === '"' || source[cursor] === "'"){
				var result = skipString(source, cursor, true);
				cursor = result.cursor;
				path = result.string;
			}
		}
		return {cursor: cursor, path: path};
	}
	function getAmdArguments(source, cursor){
		var path = getPath(source, cursor);
		path.cursor = skipWhiteSpaces(source, path.cursor);
		path.cursor += 1;
		path.cursor = skipWhiteSpaces(source, path.cursor);

		var type = skipString(source, path.cursor, true);
		return {
			cursor: type.cursor,
			path: path.path,
			type: type.string
		}
	}
	function getPaths(source){
		var ch, cursor = 0, buffer = {require: '', include: ''}, paths = [];
		while(ch = source[cursor]){
			if(ch === '/' && (source[cursor + 1] === '/' || source[cursor + 1] === '*')){
				cursor = skipComment(source, cursor);
			}
			if(ch === "'" || ch === '"'){
				cursor = skipString(source, cursor).cursor;
			}
			if(buffer.require){
				buffer.require += ch;
				var requireTest = isRequire(buffer.require);
				if(requireTest.test){
					if(requireTest.full){
						var result = getPath(source, cursor + 1);
						cursor = result.cursor;
						if(result.path){
							paths.push(result.path);
						}
						buffer.require = '';
					}
				}else{
					buffer.require = '';
				}
			}
			if(buffer.include){
				buffer.include += ch;
				var requireTest = isAmdPack(buffer.include);
				if(requireTest.test){
					if(requireTest.full){
						var result = getAmdArguments(source, cursor + 1);
						cursor = result.cursor;
						if(result.path){
							paths.push(result);
						}
						buffer.include = '';
					}
				}else{
					buffer.include = '';
				}
			}
			if(ch === 'r' && !buffer.require){
				buffer.require += ch;
			}
			if(ch === 'a' && !buffer.include){
				buffer.include += ch;	
			}
			cursor += 1;
		}
		return {paths: paths, source: source};
	}
	function wrapper(wrapper, source, name, deps){
		deps.reverse();
		var open = fs.readFileSync(path.resolve(rootDir, './wrappers/amd/'+wrapper+"-open"), 'utf-8');
		var close = fs.readFileSync(path.resolve(rootDir, './wrappers/amd/'+wrapper+"-close"), 'utf-8');
		var amdLoader = fs.readFileSync(path.resolve(rootDir, './wrappers/amd/'+wrapper+"-loader"), 'utf-8');

		return (
			open.replace('@name@', name).replace('@wsInjection@', wss ? wsInjection.replace('@PORT@', wss.options.port) : '') +
			'\n\t' + 
			indent(exportsToReturn(source)) + 
			'\n' + 
			close.replace('@AMD_MODULES@', deps.map(function(module){
				if(module.type && includeModifers[module.type]){
					module.dep = includeModifers[module.type](module.dep);
				}
				return amdLoader.replace(/\@PATH\@/ig, module.path).replace('@AMD_MODULE@', '\t'+indent(module.dep, '\t\t'));
			}).join('\n'))
		);
	}

	function indent(source, indent){
		return source.replace(/[\n\r]+/ig, '\n' + (indent || '\t'));
	}
	function getDependencies(source, resolveDir, cutter){
		var result = getPaths(source || '');
		var deps = result.paths.map(function(dep){
			var resolvedPath = path.resolve(resolveDir, dep.path || dep);
			try{
				fs.statSync(resolvedPath);
			}catch(e){
				resolvedPath = require.resolve(dep);
			}
			source = source.replace(dep.path || dep, cutter(resolvedPath));
			return dep.path ? {path: resolvedPath, type: dep.type} : resolvedPath;
		}).filter(Boolean);
		return {deps: deps, source: source};
	}
	function getDir(_path, resolveDir){
		return path.resolve(resolveDir || '', path.dirname(_path));
	}
	function cutter(cut, minify, path){
		if(minify){
			if(this.paths[path] === undefined){
				this.index += 1;
				this.paths[path] = this.index;
			}
			return this.paths[path];
		}else{
			return path.replace(cut, '').replace(/\\/ig, '/');
		}
	}
	function exportsToReturn(source){
		return source.replace(/module\.?\[?\'?\"?exports\"?\'?\]?[ \t\n\r]*\=/ig, 'return ');
	}
	function runBuilders(type, path, source, builders, cl){
		var activeBuilders = builders.filter(function(item){
			return (
				item.action === type && 
				(!item.ext || item.ext.test(path)) &&
				!item.skip.some(function(re){
					return re.test(path);
				})
			)
		});
		async.each(activeBuilders, function(builder, callback){
			builder.handler(source, function(newSource){
				source = newSource;
				callback();
			});
		}, function(){
			cl(source);
		});
	}
	function loadFile(path, builders, cl){
		fs.readFile(path, 'utf-8', function(err, source){
			if(!builders){
				cl(source);
			}else{
				runBuilders('loading', path, source, builders, cl)
			}
		});
	}
	function resolveFiles(rootFile, options, isRoot, cl){
		var end;
		var wrapperType;
		if(rootFile.path){
			wrapperType = rootFile.type;
			rootFile = rootFile.path;
		}
		var resolvedPath = path.resolve(rootFile);
		loadFile(resolvedPath, options.builders, function(source){
			var result = getDependencies(source, getDir(rootFile), options.cutter);
			var cuttedPath = options.cutter(resolvedPath);
			if(!isRoot){
				if(!loadedFiles[cuttedPath]){
					deps.push({path: cuttedPath, dep: result.source, type: wrapperType});
				}else{
					var priorityDep;
					for(var i = 0, len = deps.length; i < len; i++){
						if(deps[i]['path'] === cuttedPath){
							priorityDep = deps.splice(i, 1)[0];
							break;
						}
					}
					deps.push(priorityDep); priorityDep = null;
				}
			}else{
				end = function(){
					if(isRoot){
						var _deps = deps;
						deps = [];
						loadedFiles = {};
						if(!options.watch){
							watchedFiles = {};
						}
						cl({path: cuttedPath, source: result.source, deps: _deps});	
					}
					return true;
				}
			}

			loadedFiles[cuttedPath] = true;
			watchedFiles[resolvedPath] = true;
			

			result.deps = result.deps.filter(function(source){
				return !loadedFiles[source.path || source];
			});

			if(result.deps.length){
				async.parallel(
					result.deps.map(function(source){
						return function(callback){
							resolveFiles(source, options, false, function(){
								callback(null, true);
							});
						}
					}), 
					end || cl
				);
			}else{
				(!!end && end()) || (!!cl && cl());
			}
		});
	}

	function strToRe(arr, context){
		reArr = [];
		if(Array.isArray(arr)){
			for(var i = 0, len = arr.length; i < len; i++){
				if(typeof arr[i] === 'string'){
					reArr.push(new RegExp(arr[i], 'ig'));
				}else{
					console.warn(context + ' skip option with index '+i+' is not a string for RE.');
				}
			}
		}else{
			console.warn(context + ' skip option is not a array');
		}
		return reArr;
	}
	function build(options, cl){
		if(!wss && options.socketUpdate){
			wss = require('ws').Server({ port: options.socketUpdate || 8721 });
			console.log('WSS started on ' + wss.options.port + '.');
		}

		if(!options.cut){ options.cut = path.resolve('../') }
			options.cutter = cutter.bind({paths: {}, index: -1}, options.cut, options.minify);

		if(!options.wrapper){ options.wrapper = 'amd'; }
		if(!options.name){ options.name = __dirname.replace(/\\/ig, '/').split('/').pop() + (new Date().getTime()); }
		if(options.skip){
			options.skip = strToRe(options.skip, 'Global,');
		}else{
			options.skip = [];
		}
		if(options.builders){
			for(var i = 0, len = options.builders.length; i < len; i++){
				var builder = options.builders[i];
				if(builder.ext){
					builder.ext = builder.ext ? new RegExp('\\.' + builder.ext + '$','i') : /\.[^]+?$/i;
				}
				builder.skip = options.skip.concat(strToRe(builder.skip || [], 'Builder with index: '+i+','));
			}
		}
		var postResolving = function(root){
			if(options.watch && options.output){
				var watcher = function(prev, next){
					console.time('rebuild time:');
					unWatch();
					resolveFiles(options.input, options, true, function(){
						if(options.socketUpdate){
							wss.clients.forEach(function(client){
								client.send('refresh');
							});
						}
						postResolving.apply(this, arguments);
						console.timeEnd('rebuild time:');
					});
				};
				var watch = function(){
					for(var i = 0, k = Object.keys(watchedFiles), key = k[0], l = k.length; i < l; i++, key = k[i]){
					    fs.watchFile(key, watcher);
					}
				}
				var unWatch = function(){
					for(var i = 0, k = Object.keys(watchedFiles), key = k[0], l = k.length; i < l; i++, key = k[i]){
					    fs.unwatchFile(key, watcher);
					}
					watchedFiles = {};
				};
				watch();
			}
			
			var result = wrapper(options.wrapper, root.source, options.name, root.deps);
			runBuilders('packing', null, result, options.builders, function(result){
				if(options.minify){
					result = uglify.minify(result, {fromString: true}).code;
				}
				if(options.output){
					fs.writeFileSync(options.output.replace('@name@', options.name), result, 'utf-8');
				}else if(cl){
					cl(result);
				}
			})
		};
		resolveFiles(options.input, options, true, postResolving);
	}

	return build;
}