var refreshSocket = new WebSocket("ws://" + window.location.hostname + ':8721');
	refreshSocket.onmessage = function(){	window.location.reload(); };
	