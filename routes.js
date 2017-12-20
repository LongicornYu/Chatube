// This file is required by app.js. It sets up event listeners
// for the two main URL endpoints of the application - /create and /chat/:id
// and listens for socket.io messages.

// Use the gravatar module, to turn email addresses into avatar images:

var gravatar = require('gravatar');
var os = require('os');
var http = require('http');
// Export a function, so that we can pass
// the app and io instances from the app.js file:

module.exports = function(app,io){

	app.get('/', function(req, res){

		// Render views/home.html
		res.render('home');
	});

	app.get('/videoChat', function(req, res){

		// Render views/videoChat.html
		res.render('videoChat');
	});

	app.get('/create', function(req,res){

		// Generate unique id for the room
		var id = Math.round((Math.random() * 1000000));

		// Redirect to the random room
		res.redirect('/chat/'+id);
	});

	app.get('/chat/:id', function(req,res){

		// Render the chant.html view
		res.render('chat');
	});

	// Initialize a new socket.io application, named 'chat'
	var chat = io.on('connection', function (socket) {

		// When the client emits the 'load' event, reply with the
		// number of people in this chat room

		socket.on('load',function(data){

			var room = findClientsSocket(io,data);
			if(room.length === 0 ) {

				socket.emit('peopleinchat', {number: 0});
			}
			else if(room.length === 1) {

				socket.emit('peopleinchat', {
					number: 1,
					user: room[0].username,
					avatar: room[0].avatar,
					id: data
				});
			}
			else if (room.length >=2)
			{
				chat.emit('tooMany', {boolean: true});
			}
		});

		// When the client emits 'login', save his name and avatar,
		// and add them to the room
		socket.on('login', function(data) {

			var room = findClientsSocket(io, data.id);
			// Only two people per room are allowed
			if (room.length < 2) {

				// Use the socket object to store data. Each client gets
				// their own unique socket object

				socket.username = data.user;
				socket.room = data.id;
				socket.email = data.email
				socket.avatar = data.avatar;
				//socket.avatar = gravatar.url(data.avatar, {s: '140', r: 'x', d: 'mm'});

				// Tell the person what he should use for an avatar
				socket.emit('img', socket.avatar);

				// Add the client to the room
				socket.join(data.id);

				if (room.length == 1) {
					var usernames = [],
						avatars = [];

					usernames.push(room[0].username);
					usernames.push(socket.username);

					avatars.push(room[0].avatar);
					avatars.push(socket.avatar);

					// Send the startChat event to all the people in the
					// room, along with a list of people that are in it.

					chat.in(data.id).emit('startChat', {
						boolean: true,
						id: data.id,
						users: usernames,
						avatars: avatars
					});
				}
			}
			else {
				socket.emit('tooMany', {boolean: true});
			}
		});

		// Somebody left the chat
		socket.on('disconnect', function() {

			// Notify the other person in the chat room
			// that his partner has left

			socket.broadcast.to(this.room).emit('leave', {
				boolean: true,
				room: this.room,
				user: this.username,
				avatar: this.avatar
			});

			// leave the room
			socket.leave(socket.room);
		});

		socket.on('videoChat', function(data){
	        socket.emit('created', {senderId:data.senderId, user: this.username, avatar:this.avatar});
				  socket.broadcast.to(this.room).emit('created', {senderId: data.senderId, user: this.username,avatar: this.avatar});
	        socket.emit('videoChatInvite', {senderId: data.senderId, avatar: this.avatar});
	        socket.broadcast.to(this.room).emit('videoChatInvite', {senderId: data.senderId, avatar: this.avatar});
	    });

		socket.on('audioChat', function(data){
						socket.emit('audiocreated', {senderId:data.senderId, user: this.username, avatar:this.avatar});
						socket.broadcast.to(this.room).emit('audiocreated', {senderId: data.senderId, user: this.username,avatar: this.avatar});
						socket.emit('audioChatInvite', {senderId: data.senderId, avatar: this.avatar});
						socket.broadcast.to(this.room).emit('audioChatInvite', {senderId: data.senderId, avatar: this.avatar});
				});



		socket.on('videoChatJoined', function(data){
					socket.emit('joined',{senderId:data.senderId, user: this.username, avatar:this.avatar});
				  socket.broadcast.to(this.room).emit('joined', {senderId:data.senderId, user: this.username, avatar:this.avatar});

					chat.in(data.senderId).emit('ready');
					socket.broadcast.to(this.room).emit('ready');
	    });

		socket.on('videoChatCancelled', function(data){
					console.log("video call cancel");
					chat.in(data.senderId).emit('videoChatSelfCancel', data.senderId);
					socket.broadcast.to(this.room).emit('videoChatSelfCancel', data.senderId);
		});

		socket.on('videoChatRejected', function(data){
					chat.in(data.senderId).emit('videoChatRefused', data.senderId);
					socket.broadcast.to(this.room).emit('videoChatRefused', data.senderId);
	    });


		socket.on('audioChatJoined', function(data){
						socket.emit('audiojoined',{senderId:data.senderId, user: this.username, avatar:this.avatar});
					  socket.broadcast.to(this.room).emit('audiojoined', {senderId:data.senderId, user: this.username, avatar:this.avatar});

						chat.in(data.senderId).emit('audioready');
						socket.broadcast.to(this.room).emit('audioready');
		    });

		socket.on('audioChatCancelled', function(data){
						console.log("audio call cancel");
						chat.in(data.senderId).emit('audioChatSelfCancel', data.senderId);
						socket.broadcast.to(this.room).emit('audioChatSelfCancel', data.senderId);
			});

		socket.on('audioChatRejected', function(data){
						chat.in(data.senderId).emit('audioChatRefused', data.senderId);
						socket.broadcast.to(this.room).emit('audioChatRefused', data.senderId);
		    });


		socket.on('emailChatHistory', function(data){
			// When the server receives a message, it sends it to the other person in the room.
			var webshot = require('node-webshot');

			var options = {
			  shotSize: {
			    width: 'all'
			  , height: 'all'
			  }
			  , siteType:'html'
			};
			var chatHistoryImageName=Math.round((Math.random() * 1000000));
			var recipientEmail = this.email;
			webshot(data.emailtext, './public/chatScreenShot/chatHistory'+chatHistoryImageName+'.png', options, function(err) {
			  // screenshot now saved to hello_world.png
				emailChatTranscript(recipientEmail,'./public/chatScreenShot/chatHistory'+chatHistoryImageName+'.png', 'chatHistory'+chatHistoryImageName+'.png');
			});


		});

		// Handle the sending of messages
		socket.on('msg', function(data){
			// When the server receives a message, it sends it to the other person in the room.
			socket.broadcast.to(socket.room).emit('receive', {isImage: data.isImage, msg: data.msg, user: data.user, img: data.img});
		});

		socket.on('snapReceived', function(data){
			console.log(data);
			chat.in(data.senderId).emit('renderSnap', {buf:data.buf, senderId:data.senderId, user:this.username, img:this.avatar});
			socket.broadcast.to(this.room).emit('renderSnap', {buf:data.buf, senderId:data.senderId, user:this.username, img:this.avatar});
		});

		socket.on('message', function(data) {
			// for a real app, would be room-only (not broadcast)
			chat.in(data.senderId).emit('ice-message', data.message);
			socket.broadcast.to(this.room).emit('ice-message', data.message);
		});

		socket.on('message-audio', function(data) {
			// for a real app, would be room-only (not broadcast)
			chat.in(data.senderId).emit('ice-message-audio', data.message);
			socket.broadcast.to(this.room).emit('ice-message-audio', data.message);
		});

		socket.on('ipaddr', function() {
		    var ifaces = os.networkInterfaces();
		    for (var dev in ifaces) {
		      ifaces[dev].forEach(function(details) {
		        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
		          socket.emit('ipaddr', details.address);
		        }
		      });
		    }
		  });

	});
};

function emailChatTranscript(email, attachmentPath, attachmentName){
		var nodemailer = require('nodemailer');

		var transporter = nodemailer.createTransport({
		  service: 'gmail',
		  auth: {
		    user: 'chatubeapp@gmail.com',
		    pass: 'chatube531'
		  }
		});

		var msg = '<img src="cid:'+attachmentName+'" />'

		var mailOptions = {
		  from: 'chatubeapp@gmail.com',
		  to: email,
		  subject: 'Chat history',
		  html: msg,
		  attachments: [{
		        filename: attachmentName,
		        path: attachmentPath,
		        cid: attachmentName //same cid value as in the html img src
		    }]

		};
		transporter.sendMail(mailOptions, function(error, info){
		  if (error) {
		    console.log(error);
		  } else {
		    console.log('Email sent: ' + info.response);
		  }
		});

}


function findClientsSocket(io,roomId, namespace) {
	var res = [],
		ns = io.of(namespace ||"/");    // the default namespace is "/"

	if (ns) {
		for (var id in ns.connected) {
			if(roomId) {
				var index = ns.connected[id].rooms.indexOf(roomId) ;
				if(index !== -1) {
					res.push(ns.connected[id]);
				}
			}
			else {
				res.push(ns.connected[id]);
			}
		}
	}
	return res;
}
