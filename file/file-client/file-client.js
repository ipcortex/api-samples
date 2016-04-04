var rooms = {};
var media = {};
var accepted = {};
var TAG = 'IPC-VIDEO-CLIENT:';
var host = 'https://pabx.hostname';
IPCortex.PBX.Auth.setHost(host);

function processFile(file) {
	if ( file.state == 'acknowledged' && file.party == 'receive' )
		file.accept();
	for ( cid in file.progress ) {
		var progress = document.querySelector('#c' + cid + ' .progress');
		if ( progress )
			progress.style.width = file.progress[cid].progress + '%';
		if ( file.progress[cid].status == 'complete' ) {
			progress.style.width = '0%';
			if ( file.party == 'receive' ) {
				var link = document.querySelector('#c' + cid + ' .file-link');
				var download = document.querySelector('#c' + cid + ' .file-download');
				download.className = 'material-icons file-download';
				var url = window.URL.createObjectURL(file.file);
				link.href = url;
				link.download = file.label;
			}
		}
	}
}

function processContact(contact) {
	/* Don't process contacts that match the logged in user */
	if ( contact.cID == IPCortex.PBX.Auth.id )
		return;
	var element = document.getElementById('c' + contact.cID);
	/* Return early if contact exists */
	if ( element ) {
		/* Remove offline contacts */
		if ( ! contact.canChat && element.parentNode )
			element.parentNode.removeChild(element);
		return;
	}
	/* Create online contact */
	if ( contact.canChat ) {
		var clone = document.getElementById('contact-clone').cloneNode(true);
		clone.id = 'c' + contact.cID;
		clone.firstChild.nodeValue = contact.name;
		document.getElementById('contacts').appendChild(clone);
		var send = clone.querySelector('.file-send');
		var link = clone.querySelector('.file-link');
		var input = clone.querySelector('.file-input');
		var download = clone.querySelector('.file-download');
		input.addEventListener('change',
			function(e) {
				if ( e.target.files && e.target.files.length == 1 )
					send.className = 'material-icons file-input';
				else
					send.className = 'material-icons file-input disabled';
			}
		);
		send.addEventListener('click',
			function() {
				for ( var roomID in rooms ) {
					if ( rooms[roomID].cID != contact.cID )
						continue;
					rooms[roomID].sendFile(input.files[0]).addListener('update', processFile);
					return;
				}
				media = {cID: contact.cID, file: input.files[0]};
				contact.chat();
			}
		);
		download.addEventListener('click',
			function() {
				download.className = 'material-icons file-download disabled';
				link.click();
			}
		);
	}
}

function startTask() {
	/* Start API collecting data */
	IPCortex.PBX.startFeed().then(
		function() {
			console.log(TAG, 'Live data feed started');
			/* API is ready, loop through the list of contacts */
			IPCortex.PBX.contacts.forEach(
				function(contact) {
					/* Listen for updates incase the contact changes state */
					contact.addListener('update', processContact);
					processContact(contact);
				}
			);
			/* Enable chat to allow feature (file negotiation) messages to be exchanged */ 
			var chatEnabled = IPCortex.PBX.enableChat(
				function(room) {
					/* Listen for updates to clean up dead rooms */
					room.addListener('update',
						function(room) {
							if ( rooms[room.roomID] && room.state == 'dead' )
								delete rooms[room.roomID];
						}
					);
					/* If the room has come into existance due to a file request,
					   send the stored file */
					if ( room.cID == media.cID && media.file ) {
						console.log(TAG, 'New room, starting video chat');
						/* Listen for updates on the Av instance */
						room.sendFile(input.files[0]).addListener('update', processFile);
						media = {};
					}
					rooms[room.roomID] = room;
				}
			);
			if ( chatEnabled ) {
				console.log(TAG, 'Chat enable, enabling file feature');
				/* Register to receive new File instances */
				IPCortex.PBX.enableFeature(
					'file',
					function(file) {
						/* Listen for updates to the File instance */
						file.addListener('update', processFile);
						processFile(file);
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
