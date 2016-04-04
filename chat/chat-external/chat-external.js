var rooms = {};
var TAG = 'IPC-CHAT-CLIENT:';
IPCortex.PBX.Auth.setHost('https://pabx.hostname');

/* Login */
IPCortex.PBX.Auth.login().then(
	function() {
		console.log(TAG, 'Login successful');
		/* Start API collecting data */
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

/* Handle each new contact */
function processContact(contact) {
	/* Return early if this is "myself" */
	if ( contact.cID == IPCortex.PBX.Auth.id ) {
		return;
	}
	/* Return early if contact exists */
	var element = document.getElementById(contact.cID);
	if ( element ) {
		/* Remove offline contacts */
		if ( ! contact.canChat && element.parentNode )
			element.parentNode.removeChild(element);
		return;
	}
	/* Create online contact */
	if ( contact.canChat ) {
		var element = document.createElement('div');
		document.getElementById('contacts').appendChild(element);
		element.innerHTML = contact.name;
		element.className = 'contact';
		element.id = contact.cID;
		var offer = document.createElement('i');
		element.appendChild(offer);
		offer.className = 'material-icons contact-offer';
		offer.innerHTML = 'chat_bubble';
		offer.addEventListener('click', function() {
			contact.chat();
		});
	}
}

/* Listen for new rooms */
function processRoom(newRoom) {
	console.log(TAG, 'New room');

	/* Listen for updates to clean up dead rooms */
	newRoom.addListener('update', function(room) {
		/* If a room is dead, delete from DOM */
		if ( rooms[room.roomID] && room.state == 'dead' ) {
			rooms[room.roomID].elem.parentNode.removeChild(rooms[room.roomID].elem);
			delete rooms[room.roomID];
			return;
		}
		/* If room name has changed, update on display */
		if ( rooms[room.roomID].label !== room.label ) {
			rooms[room.roomID].label = room.label;
			rooms[room.roomID].title.innerHTML = room.label + ' (' + newRoom.roomID + ')';
		}
		/* Add new messages into textarea */
		room.messages.forEach(function (message) {
			rooms[room.roomID].text.value += '\n' + message.cN + ' :\n  ' + message.msg;
			rooms[room.roomID].text.scrollTop = rooms[room.roomID].text.scrollHeight;
		});
	});
	/* For each new room we need to store the provided Class object
	 * and create display elements
	 */
	var elem = document.getElementById('clone').cloneNode(true);
	elem.style.display = 'block';
	elem.id = newRoom.roomID;
	document.body.appendChild(elem);

	/* Store important room info needed as events occur */
	var thisRoom = rooms[newRoom.roomID] = {
		room: newRoom,
		elem: elem,
		title: elem.getElementsByTagName('div')[0],
		text: elem.getElementsByTagName('textarea')[0]
	};

	/* Quick way to get hold of input box and submit buttons */
	var inputs = elem.getElementsByTagName('input');
	inputs[0].addEventListener('click', function() {
		console.log(TAG, 'Close room', thisRoom.room.roomID);
		thisRoom.room.leave();
	});
	inputs[2].addEventListener('click', function() {
		console.log(TAG, 'Send message on room', thisRoom.room.roomID);
		/* No text entered, nothing to send */
		if ( ! inputs[1].value )
			return;
		/* Send the message and clear the input */
		thisRoom.room.post(inputs[1].value);
		inputs[1].value = '';
	});

	/* For all external contacts in the room, provide the URL */
	var members = newRoom.members || {};
	for ( var m in members ) {
		if ( ! members[m].uname )
			continue;
		thisRoom.text.value += members[m].name + ':\n' + members[m].url + '\n';
	}
}

function runApp() {
	/* API is ready, loop through the list of contacts */
	IPCortex.PBX.contacts.forEach(
		function(contact) {
			/* Listen for updates in case the user changes state */
			contact.addListener('update', function() {
				processContact(contact);
			});
			processContact(contact);
		}
	);

	/*
	 * Enable chat subsystem. This call provides a shortcut for providing a new-room callback.
	 * Enabling chat automatically makes the current user 'online'
	 */
	console.log(TAG, 'Chat enable');
	IPCortex.PBX.enableChat(processRoom);

	/*
	 * Enable the External invite button
	 */
	var extname = document.getElementById("extname");
	var extaddr = document.getElementById("extaddress");
	document.getElementById("extinvite").addEventListener('click', function() {
		var contact = {};
		if (extname.value.search(/^[0-9a-zA-Z '\-\.]+$/) != -1) {
			contact.name = extname.value;
		} else {
			alert('Invalid name entered');
			return false;
		}
		if (extaddr.value.search(/^(\+|0|00|)[1-9][0-9]{6}[0-9]+$/) != -1) {
			contact.mobile = extaddr.value;
			contact.invite = true;
		} else if (extaddr.value.search(/^.+@[0-9a-zA-Z\.\-]+$/) != -1) {
			contact.email = extaddr.value;
			contact.invite = true;
		} else if (extaddr.value != '') {
			alert('Invalid contact entered');
			return false;
		}

		IPCortex.PBX.chatInvite([contact]).catch(function(e) {
			concole.log('Error on external invite', e);
		});

		extname.value = '';
		extaddr.value = '';
		return false;
	});
}

