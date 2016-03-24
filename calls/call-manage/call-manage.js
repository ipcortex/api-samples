var TAG = 'IPC-CALLS:';

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

/* Storage for holding details of known calls */
var calls = {};

/* Main application setup */
function runApp() {
	/* Grab references to DOM elements */
	var numberTag = document.getElementById('number');
	var callTag = document.getElementById('call');

	/* Grab the first owned device for the logged in user */
	var myPhone = IPCortex.PBX.owned[0];

	/* Very simple error-check */
	if ( !myPhone || !myPhone.webrtc ) {
		throw(Error('Cannot find WebRTC capable device'));
	}
	/* Enable WebRTC connection */
	myPhone.enableRTC();

	/* Wait for new call events to arrive */
	myPhone.addListener('update', function (device) {
		/* If there are multiple calls, ignore all except the first */
		device.calls.forEach(function(call) {
			processCall(call);
		});
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
}

/* each time something changes, create, update or remove the call as needed */
function processCall(call) {
	if ( !calls[call.uid] ) {
		if( call.state === 'dead' )
			return;
		/* A new call has appeared, and is not 'dead' */
		newCall(call);
	}
	if( call.state === 'dead' ) {
		/* A known call is now dead, delete it */
		calls[call.uid].elem.parentNode.removeChild(calls[call.uid].elem);
		delete calls[call.uid];
		return;
	}
	if ( call.state === 'up' && calls[call.uid].state !== 'up' ) {
		/* A call not previously 'up' is now 'up' so attach it's media stream */
		var videoTag = document.getElementById('phone');
		if (call.remoteMedia)
			attachMediaStream(videoTag, call.remoteMedia[0]);
	}
	if (call.state !== calls[call.uid].state) {
		/* Call state has changed, so possibly update the control icons
		 * The control icons are in an array of
		 *    [hangup, hold, talk, ringing]
		 */
		switch(call.state) {
			case('dial'):	/* Outbound call being dialled */
				console.log(TAG, 'Call', call.uid, 'Outbound dial state');
				calls[call.uid].buttons[0].style.display = 'block';
				calls[call.uid].buttons[1].style.display = 'none';
				calls[call.uid].buttons[2].style.display = 'none';
				calls[call.uid].buttons[3].style.display = 'block';
				break;
			case('ring'):	/* Inbound call ringing */
				console.log(TAG, 'Call', call.uid, 'Inbound ring state');
				calls[call.uid].buttons[0].style.display = 'block';
				calls[call.uid].buttons[1].style.display = 'none';
				calls[call.uid].buttons[2].style.display = 'block';
				calls[call.uid].buttons[3].style.display = 'block';
				break;
			case('up'):	/* Call is up and proceeding */
				console.log(TAG, 'Call', call.uid, 'is up');
				calls[call.uid].buttons[0].style.display = 'block';
				calls[call.uid].buttons[1].style.display = 'block';
				calls[call.uid].buttons[2].style.display = 'none';
				calls[call.uid].buttons[3].style.display = 'none';
				break;
			case('hold'):	/* Call is on hold */
				console.log(TAG, 'Call', call.uid, 'is on hold');
				calls[call.uid].buttons[0].style.display = 'block';
				calls[call.uid].buttons[1].style.display = 'none';
				calls[call.uid].buttons[2].style.display = 'block';
				calls[call.uid].buttons[3].style.display = 'none';
				break;
			default:
				calls[call.uid].buttons[0].style.display = 'block';
				calls[call.uid].buttons[1].style.display = 'none';
				calls[call.uid].buttons[2].style.display = 'none';
				calls[call.uid].buttons[3].style.display = 'none';
				break;
		};
	}

	/* Ensure that the caller name is up to date */
	calls[call.uid].name.innerHTML = call.label;

	/* Record the call's previous state to detect changes */
	calls[call.uid].state = call.state;
}

/* For a new call, clone the DOM element to make the call visible, and store the necessary data for later */
function newCall(call) {
        /* For each new room we need to store the provided Class object
         * and create display elements
         */
	var callsTag = document.getElementById('calls');
        var elem = document.getElementById('clone').cloneNode(true);
        elem.style.display = 'block';
        elem.id = call.uid;
        callsTag.appendChild(elem);

        /* Store important room info needed as events occur */
	calls[call.uid] = {
		state: 'new',
                elem: elem,
                name: elem.getElementsByTagName('span')[0],
                buttons: elem.getElementsByTagName('i')
        };

	/* Quick and dirty handlers onto the created buttons for this call
	 * The control icons are in an array of
	 *    [hangup, hold, talk, ringing]
	 */
	var inputs = calls[call.uid].buttons;
        inputs[0].addEventListener('click', function() {
                console.log(TAG, 'Hangup call', call.uid);
                call.hangup();
        });
        inputs[1].addEventListener('click', function() {
                console.log(TAG, 'Hold call', call.uid);
                call.hold();
        });
        inputs[2].addEventListener('click', function() {
                console.log(TAG, 'Start/Unhold call', call.uid);
                call.talk();
        });
}
