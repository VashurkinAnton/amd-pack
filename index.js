var fs = require('fs');
var path = require('path');
var uglify = require('uglify-js');
var commander = require('commander');

commander
  .version('1.0.0')
  .option('-i, --input [path]', 'Path to root file for build.')
  .option('-o, --output [path]', 'Path to file for save result.')
  .option('-n, --name [string]', 'Module name for global init.')
  .option('-m, --minify', 'Minify builded file')
  .option('-w, --watch', 'Watch all dependencies, and rebuild module if it\'s changed.')
  .parse(process.argv);

var loadedFiles = {};
var watchedFiles = {};
var deps = [];
var rootDir = path.dirname(__filename);

function isRequire(str){
	var test = 'require';
	var len = str.length; 
	var result = false;
	var isFull = false;
	if(len < 7){
		result = test.substring(0, len) === str;
	}else{
		result = isFull = test === str;
	}
	return {test: result, full: isFull};
}
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
function getPaths(source){
	var ch, cursor = 0, buffer = '', paths = [];
	while(ch = source[cursor]){
		if(ch === '/' && (source[cursor + 1] === '/' || source[cursor + 1] === '*')){
			cursor = skipComment(source, cursor);
		}
		if(buffer){
			buffer += ch;
			var requireTest = isRequire(buffer);
			if(requireTest.test){
				if(requireTest.full){
					var result = getPath(source, cursor + 1);
					cursor = result.cursor;
					if(result.path){
						paths.push(result.path);
					}
					buffer = '';
				}
			}else{
				buffer = '';
			}
		}
		if(ch === 'r' && !buffer){
			buffer += ch;
		}
		cursor += 1;
	}
	return paths;
}
function wrapper(wrapper, source, name, deps){
	deps.reverse();
	var open = fs.readFileSync(path.resolve(rootDir, './wrappers/amd/'+wrapper+"-open"), 'utf-8');
	var close = fs.readFileSync(path.resolve(rootDir, './wrappers/amd/'+wrapper+"-close"), 'utf-8');
	var amdLoader = fs.readFileSync(path.resolve(rootDir, './wrappers/amd/'+wrapper+"-loader"), 'utf-8');

	return (
		open.replace('@name@', name) + 
		'\n\t' + 
		indent(exportsToReturn(source)) + 
		'\n' + 
		close.replace('@AMD_MODULES@', deps.map(function(module){
			return amdLoader.replace(/\@PATH\@/ig, module.path).replace('@AMD_MODULE@', '\t'+indent(module.dep, '\t\t'));
		}).join('\n'))
	);
}

function indent(source, indent){
	return source.replace(/[\n\r]+/ig, '\n' + (indent || '\t'));
}
function getDependencies(source, resolveDir, cutter){
	var deps = getPaths(source || '').map(function(dep){
		var resolvedPath = path.resolve(resolveDir, dep);
		try{
			fs.statSync(resolvedPath);
		}catch(e){
			resolvedPath = require.resolve(dep);
		}
		source = source.replace(dep, cutter(resolvedPath));
		return resolvedPath;
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

function resolveFiles(rootFile, cutter, isRoot, options){
	var resolvedPath = path.resolve(rootFile);
	var source = fs.readFileSync(resolvedPath, 'utf-8');
	var result = getDependencies(source, getDir(rootFile), cutter);
	var cuttedPath = cutter(resolvedPath);
	if(!isRoot){
		if(!loadedFiles[cuttedPath]){
			deps.push({path: cuttedPath, dep: result.source});
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
	}

	loadedFiles[cuttedPath] = true;
	watchedFiles[resolvedPath] = true;
	result.deps.forEach(function(source){
		if(!loadedFiles[source]){
			resolveFiles(source, cutter);
		}
	});
	if(isRoot){
		var _deps = deps;
		deps = [];
		loadedFiles = {};
		if(!options.watch){
			watchedFiles = {};
		}
		return {path: cuttedPath, source: result.source, deps: _deps};	
	}
}
function build(options){
	if(!options.cut){ options.cut = path.resolve('../') }
	if(!options.wrapper){ options.wrapper = 'amd'; }
	if(!options.name){ options.name = __dirname.replace(/\\/ig, '/').split('/').pop() + (new Date().getTime()); }
	var root = resolveFiles(options.input, cutter.bind({paths: {}, index: -1}, options.cut, options.minify), true, options);
	if(options.watch && options.output){
		var watcher = function(prev, next){
			var start = +new Date();
			unWatch();
			build(options);
			console.log('rebuild date:', new Date(), '; rebuild time:', +new Date - start ,'ms');
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
	if(options.minify){
		result = uglify.minify(result, {fromString: true}).code;
	}
	if(options.output){
		fs.writeFileSync(options.output.replace('@name@', options.name), result, 'utf-8');
	}else{
		return result
	}
}

if(commander.input && commander.output){
	var start = +new Date();
	build({input: commander.input, output: commander.output, name: commander.name, minify: commander.minify, watch: commander.watch});
	console.log('Build date:', new Date(), '; build time:', +new Date - start ,'ms');
}else{
	module.exports = build;
}