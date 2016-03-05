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
        root.Slider = factory(require);
  }
}(this, function (require) { 
    var amdPack = {include: require};
	xin.registerComponent({
		name: 'Slider',
		state: {
			position: {
				min: 0,
				max: 0,
				current: 0
			}
		},
		style: {
			compiler: 'less',
			static: amdPack.include('/test2/dist/slider.less', 'string')
		},
		private:{
			updatePosition: function(offset){
				console.log('private method');
			}
		},
		public:{
			pub: function(){
				console.log('public method');
			}
		},
		hooks:{
			create: function(el){
				console.log('create');
			},
			mount: function(el){
				console.log('mount');
			},
			unmount: function(el){
				console.log('unmount');	
			},
			destroy: function(el){
				console.log('destroy');		
			},
		},
		render: amdPack.include('/test2/dist/template.jsx', 'function')
	});
}, function(){
	var __Dependencies = {};
	var require = function(name){
		return __Dependencies[name];
	}
	var _exports = function(path, module){__Dependencies[path] = module};
	//Module file: /test2/dist/slider.less
	(function(){
		var module = {};
		Object.defineProperty(module, 'exports', {
			get: function(){
				return {};
			},
			set: _exports.bind(null, '/test2/dist/slider.less')
		});
		module.export = "&{\n\n	color: \"#fff\";\n\n}";
	}());
	//Module file: /test2/dist/template.jsx
	(function(){
		var module = {};
		Object.defineProperty(module, 'exports', {
			get: function(){
				return {};
			},
			set: _exports.bind(null, '/test2/dist/template.jsx')
		});
		module.export = function(){ 
			return <div class="&">
			<text>Slider</text>
		</div>};
	}());
	return __Dependencies;
}));