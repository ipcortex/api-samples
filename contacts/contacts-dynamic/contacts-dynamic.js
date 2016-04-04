var TAG = 'IPC-CONTACTS:';
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
	/* prepare a list of icon names for the states: idle, busy, ringing, busy+ringing */
	var states = ["call_end", "phone", "ring_volume", "phone"];

	/* Inject the list of contacts into the page */
	var listElem = document.getElementById('list');
	IPCortex.PBX.contacts.forEach(function (contact) {
		var contElem = document.createElement('li');
		contElem.innerHTML = '<a href="#">' +
					'<i class="material-icons">' + states[0] + '</i>&nbsp;' +
					contact.uname + '(' + contact.cID + '), ' + contact.name +
					'</a>';
		listElem.appendChild(contElem);
		var icon = contElem.getElementsByTagName('i')[0];
		contact.addListener('update', function (cntct) {
			/* Each time this contact is updated, this method will be called.
			 * the contElem variable is scoped locally, so will remain in scope
			 * meaning that this callback will have access to the right icon to
			 * update.
			 */
			icon.innerHTML = states[cntct.blf];
		});
	});
}
