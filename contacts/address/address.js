var TAG = 'IPC-ADDRESS:';
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

	/* Inject the list of contacts into the page */
	var listElem = document.getElementById('list');
	IPCortex.PBX.getAddressbook().then(function(ab) {
		/* use the provided sort-helper to order the addressbook */
		console.log(TAG, "Addressbook loaded");
		ab.sort(function(a,b) {return a.sortFn(b);});

		/* Insert into page */
		ab.forEach(function (addr) {
			var addrElem = document.createElement('li');
			addrElem.innerHTML = '<a href="#">' +
						'<i class="material-icons notcallable">phone_missed</i> ' +
						'<i class="material-icons notchattable">chat_bubble_outline</i> ' +
						'<i class="material-icons">call_end</i> ' +
						addr.name +
						'</a>';
			listElem.appendChild(addrElem);
			var icons = addrElem.getElementsByTagName('i');
			addr.addListener('update', function (a) {
				/* Each time this address entry is updated, this method will be called.
				 * the icons variable is scoped locally, so will remain in scope
				 * meaning that this callback will have access to the right icons to
				 * update.
				 */
				processAddress(a, icons);
			});
			processAddress(addr, icons);
		});
	}).catch(function(e) {
		console.log(TAG, "Error fetching addressbook", e);
	});
}

function processAddress(a, icons) {
	/* prepare a list of icon names for the states: idle, busy, ringing, busy+ringing */
	var states = ["call_end", "phone", "ring_volume", "phone"];

	/* Initial setup or update calls this function */
	if ( a.canCall ) {
		icons[0].className = 'material-icons callable';
		icons[0].innerHTML = 'phone';
	} else {
		icons[0].className = 'material-icons notcallable';
		icons[0].innerHTML = 'phone_missed';
	}
	if ( a.canChat ) {
		icons[1].className = 'material-icons chattable';
		icons[1].innerHTML = 'chat_bubble';
	} else {
		icons[1].className = 'material-icons notchattable';
		icons[1].innerHTML = 'chat_bubble_outline';
	}
	icons[2].innerHTML = states[a.blf];
}
