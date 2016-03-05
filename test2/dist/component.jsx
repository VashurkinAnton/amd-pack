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
		static: amdPack.include('./slider.less', 'string')
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
	render: amdPack.include('./template.jsx', 'function')
});