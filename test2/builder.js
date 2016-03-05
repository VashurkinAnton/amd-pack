var builder = require('../index.js');

builder({
	input: './dist/component.jsx',
	output: './src/Slider.js',
	name: 'Slider',
	builders: [
		{
			'ext': 'less',
			'action': 'loading',
			handler: function(source, next){
				setTimeout(function(){
					console.log('Less');
					next(source);
				}, 10);
			}
		},
		{
			'ext': 'jsx',
			'action': 'loading',
			handler: function(source, next){
				console.log('JSE');
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
	]//,
	//minify: true
});