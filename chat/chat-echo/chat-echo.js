var TAG = 'IPC-CHATBOT:';
/* Display a login prompt */
IPCortex.PBX.Auth.setHost('https://pabx.hostname');
IPCortex.PBX.Auth.login().then(
	function() {
		console.log(TAG, 'Login successful');
		/* Get the API to start collecting data */
		IPCortex.PBX.startFeed().then(
			function() {
				console.log(TAG, 'Live data feed started');
				runApp();
			},
			function() {
				console.log(TAG, 'Live data feed failed');
			}
		);
	},
	function() {
		console.log(TAG, 'Login failed');
	}
);

function runApp() {
	/* Enable the chat subsystem */
	IPCortex.PBX.enableChat(
		/* Provide a callback for new rooms */
		function (ourRoom) {
			/* Add an update listener to each new room */
			ourRoom.addListener('update', function (room) {
				/* Inspect new messages and echo ... */
				room.messages.forEach(function (message) {
					console.log(message.cN + ' has decreed: ' + message.msg);
					/* ... except my own messages */
					if (!message.own)
						room.post('Apparently you decreed: ' + message.msg);
				});
			});
		}
	);
}
