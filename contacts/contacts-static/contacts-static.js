var TAG = 'IPC-CONTACTS:';
/* Display a login prompt */
IPCortex.PBX.Auth.setHost('https://pabx.hostname');
IPCortex.PBX.Auth.login().then(
	function() {
		console.log(TAG, 'Login successful');
		/* Fetch the data from the PABX without live updates. */
		IPCortex.PBX.fetchData().then(
			function() {
				console.log(TAG, 'Data fetched');
				runApp();
			},
			function() {
				console.log(TAG, 'Data fetch failed');
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
	IPCortex.PBX.contacts.forEach(function (contact) {
		var contElem = document.createElement('li');
		contElem.innerHTML = '<a href="#">' + contact.uname + '(' + contact.cID + '), ' + contact.name + '</a>';
		listElem.appendChild(contElem);
	});
}

