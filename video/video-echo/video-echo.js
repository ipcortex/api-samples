var echoedStream = {};
var TAG = 'IPC-VIDEO-ECHO:';
var host = 'https://pabx.hostname';
IPCortex.PBX.Auth.setHost(host);

/* Process the Av objects */
function processFeed(av) {
	/* Nothing to process if remoteMedia isn't an object */
	if ( typeof(av.remoteMedia) != 'object' )
		return;
	for ( var id in av.remoteMedia ) {
		if ( av.remoteMedia[id].status == 'offered' ) {
			console.log(TAG, 'Accepting offer ' + av.remoteMedia[id].cN);
			/* Accept remote parties offer */
			av.accept();
		}
		/* Wait for the remote party to connect and check the stream hasn't already been echoed */
		if ( av.remoteMedia[id].status == 'connected' && ! echoedStream[id] ) {
			console.log(TAG, 'Connected client, looping back video stream');
			echoedStream[id] = true;
			/* Clone the mediaStream and strip out the audio tracks to avoid feedback */
			var stream = av.remoteMedia[id].clone();
			stream.getAudioTracks().forEach(
				function(track) {
					stream.removeTrack(track);
				}
			);
			/* Add the clone stream to the Av object */
			av.addStream(stream);
		}
	}
}

/* Start the APIs live data feed */
function startTask() {
	IPCortex.PBX.startFeed().then(
		function() {
			console.log(TAG, 'Live data feed started');
			/* Enable chat to allow video negotiation messages to be exchanged */
			if ( IPCortex.PBX.enableChat() ) {
				console.log(TAG, 'Chat enable, enabling \'av\' feature');
				/* Enable the 'av' feature, passing a callback for new Av objects */
				IPCortex.PBX.enableFeature(
					'av',
					function(av) {
						/* Process and listen for update to new Av objects */
						av.addListener('update', processFeed);
						processFeed(av);
					},
					['chat']
				);
			}
		},
		function() {
			console.log(TAG, 'Live data feed failed');
		}
	);
}

/* Login */
IPCortex.PBX.Auth.login().then(
	function() {
		console.log(TAG, 'Login successful');
		startTask();
	},
	function() {
		console.log(TAG, 'Login failed');
	}
);
