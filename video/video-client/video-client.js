var rooms = {};
var media = {};
var accepted = {};
var TAG = 'IPC-VIDEO-CLIENT:';
var host = 'https://pabx.hostname';
IPCortex.PBX.Auth.setHost(host);

function processFeed(av) {
	/* Only process the Av instance if it has remote media */
	if ( typeof(av.remoteMedia) != 'object' )
		return;
	var videos = [];
	var feed = document.getElementById(av.id);
	for ( var id in av.remoteMedia ) {
		var video = document.getElementById(id);
		if ( av.remoteMedia[id].status == 'offered' ) {
			/* If the remote party if offering create an invite */
			if ( accepted[av.id] )
				return;
			console.log(TAG, 'Offer recieved from ' + av.remoteMedia[id].cN);
			/* Mark the offer as accepted as we may get another
			   update with the 'offer' state still set */
			accepted[av.id] = true;
			invite = document.createElement('div');
			document.body.appendChild(invite);
			invite.innerHTML = 'VIDEO CHAT: ' + av.remoteMedia[id].cN;
			invite.className = 'invite';
			var accept = document.createElement('i');
			invite.appendChild(accept);
			accept.className = 'material-icons contact-accept';
			accept.innerHTML = 'done';
			accept.addEventListener('click',
				function() {
					invite.parentNode.removeChild(invite);
					/* Grab the user media and accept the offer with the returned stream */
					navigator.mediaDevices.getUserMedia({audio: true, video: true}).then(
						function(stream) {
							av.accept(stream);
						}
					).catch(
						function() {
							console.log(TAG, 'getUserMedia failed');
						}
					);
				}
			);
			/* Listen for updates to clean up the invite if the far end cancels,
			this is a convient way to keep things in scope*/
			av.addListener('update',
				function(av) {
					if ( av.state == 'closed' )
						invite.parentNode.removeChild(invite);
				}
			);
		} else if ( av.remoteMedia[id].status == 'connected' && ! video ) {
			console.log(TAG, 'New remote media source ' + av.remoteMedia[id]);
			/* Create a new video tag to play/display the remote media */
			video = document.createElement('video');
			attachMediaStream(video, av.remoteMedia[id]);
			videos.push(video);
			video.id = id;
			video.play();
		} else if ( av.remoteMedia[id].status != 'connected' && video ) {
			/* Remove any video tags that are no longer in a 'connected' state */
			video.parentNode.removeChild(video);
		}
	}
	/* Create a feed container to hold video tags if it doesn't exist */
	if ( videos.length && ! feed ) {
		feed = document.createElement('div');
		document.body.appendChild(feed);
		feed.className = 'feed';
		feed.id = av.id;
	}
	/* Add the new video tags to the feed container */
	videos.forEach(
		function(video) {
			feed.appendChild(video);
		}
	);
	/* Remove the feed container if empty */
	if ( feed && feed.children.length < 1 )
		feed.parentNode.removeChild(feed);
}

function processContact(contact) {
	/* Don't process contacts that match the logged in user */
	if ( contact.cID == IPCortex.PBX.Auth.id )
		return;
	var element = document.getElementById(contact.cID);
	/* Return early if contact exists */
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
		offer.innerHTML = 'video_call';
		offer.addEventListener('click',
			function() {
				navigator.mediaDevices.getUserMedia({audio: true, video: true}).then(
					/* Grab the user media */
					function(stream) {
						/* Check to see if a room already exists to start video on */
						for ( var roomID in rooms ) {
							if ( rooms[roomID].cID != contact.cID )
								continue;
							/* Listen for updates on the Av instance */
							rooms[roomID].videoChat(stream).addListener('update', processFeed);
							return;
						}
						/* No room to start video, store stream and contact ID and open a new room */
						media = {cID: contact.cID, stream: stream};
						contact.chat();
					}
				).catch(
					function() {
						console.log(TAG, 'getUserMedia failed');
					}
				);
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
			/* Enable chat to allow feature (video negotiation) messages to be exchanged */
			var chatEnabled = IPCortex.PBX.enableChat(
				function(room) {
					/* Listen for updates to clean up dead rooms */
					room.addListener('update',
						function(room) {
							if ( rooms[room.roomID] && room.state == 'dead' )
								delete rooms[room.roomID];
						}
					);
					/* If the room has come into existance due to a video request,
					   start video with the stored stream */
					if ( room.cID == media.cID && media.stream ) {
						console.log(TAG, 'New room, starting video chat');
						/* Listen for updates on the Av instance */
						room.videoChat(media.stream).addListener('update', processFeed);
						media = {};
					}
					rooms[room.roomID] = room;
				}
			);
			if ( chatEnabled ) {
				console.log(TAG, 'Chat enable, enabling av feature');
				/* Register to receive new Av instances */
				IPCortex.PBX.enableFeature(
					'av',
					function(av) {
						/* Listen for updates to the Av instance */
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
