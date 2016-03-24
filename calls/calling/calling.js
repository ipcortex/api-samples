var TAG = 'IPC-DIAL:';

/* This project is loaded using the wrapper helper
 * so implement onAPILoadReady()
 */
function onAPILoadReady() {
/* Display a login prompt */
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
}

function runApp() {
	/* Grab references to DOM elements */
	var videoTag = document.getElementById('phone');
	var numberTag = document.getElementById('number');
	var callTag = document.getElementById('call');
	var hangupTag = document.getElementById('hangup');

	/* Grab the first owned device for the logged in user */
	var myPhone = IPCortex.PBX.owned[0];
	/* Assume the phone is a keevio phone and enable it for WebRTC */
	myPhone.enableRTC();
	/* Wait for new call events to arrive */
	myPhone.addListener('update', function (device) {
		/* If there are multiple calls, ignore all except the first */
		if (device.calls.length > 0) {
			/* If the call is up and has media, attach it to the video tag */
			if (device.calls[0].remoteMedia && device.calls[0].state !== 'dead')
				attachMediaStream(videoTag, device.calls[0].remoteMedia[0]);
		}
	});
	numberTag.addEventListener('keyup', function(e) {
		/* Clean up input box content */
		if ( numberTag.value.search(/[^0-9\*\#]/) != -1 )
			numberTag.value = numberTag.value.replace(/[^0-9\*\#]/, '');
	});
	callTag.addEventListener('click', function(e) {
		if ( !numberTag.value )
			return;
		myPhone.dial(numberTag.value);
		numberTag.value = '';
		e.preventDefault();
	});
	hangupTag.addEventListener('click', function(e) {
		/* The hangup button hangs up the first call if it exists */
		if (myPhone.calls.length > 0)
			myPhone.calls[0].hangup();
	});
}
