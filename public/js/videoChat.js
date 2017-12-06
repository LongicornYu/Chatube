'use strict';

/****************************************************************************
* Initial setup
****************************************************************************/

 var configuration = {
   'iceServers': [{
     'urls': 'stun:stun.l.google.com:19302'
   }]
 };

var configuration = null;

// var roomURL = document.getElementById('url');
var video = document.querySelector('video');
var photo = document.getElementById('photo');
var photoContext = photo.getContext('2d');
var trail = document.getElementById('trail');
var snapBtn = document.getElementById('snap');
var sendBtn = document.getElementById('send');

var photoContextW;
var photoContextH;

// Attach event handlers
snapBtn.addEventListener('click', snapPhoto);
sendBtn.addEventListener('click', sendPhoto);

// Create a random room if not already present in the URL.
var isInitiator;


/****************************************************************************
* Signaling server
****************************************************************************/


socket.on('ipaddr', function(ipaddr) {
  console.log('Server IP address is: ' + ipaddr);
  // updateRoomURL(ipaddr);
});

socket.on('created', function(clientId) {
  isInitiator = true;
  grabWebCamVideo();
});

socket.on('joined', function(clientId) {
  isInitiator = false;
  createPeerConnection(isInitiator, configuration);
  grabWebCamVideo();
});


socket.on('ready', function() {
  console.log('VideoSocket is ready');
  var videoChatScreen = $("#videoChatArea");
  var chatscreen = $(".chatscreen");

  videoChatScreen.addClass('leftPanel');
  chatscreen.addClass('rightPanel');

  createPeerConnection(isInitiator, configuration);

/*
  videoChatScreen = $("#videoChatArea"),
  videoChatInviteWait = $(".videoChatInviteWait"),
  videoChatInvite = $(".videoChatInvite");

  section.children().css('display', 'none');
  chatScreen.css('display','block');

  videoChatInvite.fadeOut(1200,function(){
        videoChatScreen.fadeIn(1200);
  });

  videoChatInviteWait.fadeOut(1200,function(){
        videoChatScreen.fadeIn(1200);
  });
*/
});


socket.on('message', function(message) {
  console.log('Client received message:', message);
  signalingMessageCallback(message);
});

// Join a room
//socket.emit('create or join', room);

//if (location.hostname.match(/localhost|127\.0\.0/)) {
//  socket.emit('ipaddr');
//}

/**
* Send message to signaling server
*/
function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

/**
* Updates URL on the page so that users can copy&paste it to their peers.
*/
// function updateRoomURL(ipaddr) {
//   var url;
//   if (!ipaddr) {
//     url = location.href;
//   } else {
//     url = location.protocol + '//' + ipaddr + ':2013/#' + room;
//   }
//   roomURL.innerHTML = url;
// }

/****************************************************************************
* User media (webcam)
****************************************************************************/

function grabWebCamVideo() {
  console.log('Getting user media (video) ...');
  navigator.mediaDevices.getUserMedia({
    audio: false,
    video: true
  })
  .then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
}

function gotStream(stream) {
  var streamURL = window.URL.createObjectURL(stream);
  console.log('getUserMedia video stream URL:', streamURL);
  window.stream = stream; // stream available to console
  video.src = streamURL;
  video.onloadedmetadata = function() {
    photo.width = photoContextW = video.videoWidth;
    photo.height = photoContextH = video.videoHeight;
    console.log('gotStream with with and height:', photoContextW, photoContextH);
  };
  show(snapBtn);
}

/****************************************************************************
* WebRTC peer connection and data channel
****************************************************************************/

var peerConn;
var dataChannel;

function signalingMessageCallback(message) {
  if (message.type === 'offer') {
    console.log('Got offer. Sending answer to peer.');
    peerConn.setRemoteDescription(new RTCSessionDescription(message), function() {},
                                  logError);
    peerConn.createAnswer(onLocalSessionCreated, logError);

  } else if (message.type === 'answer') {
    console.log('Got answer.');
    peerConn.setRemoteDescription(new RTCSessionDescription(message), function() {},
                                  logError);

  } else if (message.type === 'candidate') {
    peerConn.addIceCandidate(new RTCIceCandidate({
      candidate: message.candidate
    }));

  } else if (message === 'bye') {
// TODO: cleanup RTC connection?
}
}

function createPeerConnection(isInitiator, config) {
  console.log('Creating Peer connection as initiator?', isInitiator, 'config:',
              config);
  peerConn = new RTCPeerConnection(config);

// send any ice candidates to the other peer
peerConn.onicecandidate = function(event) {
  console.log('icecandidate event:', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
};

if (isInitiator) {
  console.log('Creating Data Channel');
  dataChannel = peerConn.createDataChannel('photos');
  onDataChannelCreated(dataChannel);

  console.log('Creating an offer');
  peerConn.createOffer(onLocalSessionCreated, logError);
} else {
  peerConn.ondatachannel = function(event) {
    console.log('ondatachannel:', event.channel);
    dataChannel = event.channel;
    onDataChannelCreated(dataChannel);
  };
}
}

function onLocalSessionCreated(desc) {
  console.log('local session created:', desc);
  peerConn.setLocalDescription(desc, function() {
    console.log('sending local desc:', peerConn.localDescription);
    sendMessage(peerConn.localDescription);
  }, logError);
}

function onDataChannelCreated(channel) {
  console.log('onDataChannelCreated:', channel);

  channel.onopen = function() {
    console.log('CHANNEL opened!!!');
    var videoChatScreen = $("#videoChatArea"),
    videoChatInviteWait = $(".videoChatInviteWait"),
    videoChatInvite = $(".videoChatInvite"),
    section = $(".section"),
    chatScreen = $(".chatscreen");

    section.children().css('display', 'none');
    chatScreen.css('display','block');

    videoChatInvite.fadeOut(1200,function(){
          videoChatScreen.fadeIn(1200);
    });

    videoChatInviteWait.fadeOut(1200,function(){
          videoChatScreen.fadeIn(1200);
    });
  };

  channel.onmessage = (adapter.browserDetails.browser === 'firefox') ?
  receiveDataFirefoxFactory() : receiveDataChromeFactory();
}

function receiveDataChromeFactory() {
  var buf, count;

  return function onmessage(event) {
    if (typeof event.data === 'string') {
      buf = window.buf = new Uint8ClampedArray(parseInt(event.data));
      count = 0;
      console.log('Expecting a total of ' + buf.byteLength + ' bytes');
      return;
    }

    var data = new Uint8ClampedArray(event.data);
    buf.set(data, count);

    count += data.byteLength;
    console.log('count: ' + count);

    if (count === buf.byteLength) {
      // we're done: all data chunks have been received
      console.log('Done. Rendering photo.');
      //renderPhototoArea(buf);
      var socketId = socket.io.engine.id;
      console.log(socketId);
      socket.emit('snapReceived', {buf:data, senderId:socketId});
    }
  };
}

function receiveDataFirefoxFactory() {
  var count, total, parts;

  return function onmessage(event) {
    if (typeof event.data === 'string') {
      total = parseInt(event.data);
      parts = [];
      count = 0;
      console.log('Expecting a total of ' + total + ' bytes');
      return;
    }

    parts.push(event.data);
    count += event.data.size;
    console.log('Got ' + event.data.size + ' byte(s), ' + (total - count) +
                ' to go.');

    if (count === total) {
      console.log('Assembling payload');
      var buf = new Uint8ClampedArray(total);
      var compose = function(i, pos) {
        var reader = new FileReader();
        reader.onload = function() {
          buf.set(new Uint8ClampedArray(this.result), pos);
          if (i + 1 === parts.length) {
            console.log('Done. Rendering photo.');
            renderPhototoArea(buf);
          } else {
            compose(i + 1, pos + this.result.byteLength);
          }
        };
        reader.readAsArrayBuffer(parts[i]);
      };
      compose(0, 0);
    }
  };
}


/****************************************************************************
* Aux functions, mostly UI-related
****************************************************************************/

function snapPhoto() {
  photoContext.drawImage(video, 0, 0, photo.width, photo.height);
  show(photo, sendBtn);
}

function sendPhoto() {
  // Split data channel message in chunks of this byte length.
  var CHUNK_LEN = 64000;
  console.log('width and height ', photoContextW, photoContextH);
  var img = photoContext.getImageData(0, 0, photoContextW, photoContextH),
  len = img.data.byteLength,
  n = len / CHUNK_LEN | 0;

  console.log('Sending a total of ' + len + ' byte(s)');
  dataChannel.send(len);

  // split the photo and send in chunks of about 64KB
  for (var i = 0; i < n; i++) {
    var start = i * CHUNK_LEN,
    end = (i + 1) * CHUNK_LEN;
    console.log(start + ' - ' + (end - 1));
    dataChannel.send(img.data.subarray(start, end));
  }

  // send the reminder, if any
  if (len % CHUNK_LEN) {
    console.log('last ' + len % CHUNK_LEN + ' byte(s)');
    dataChannel.send(img.data.subarray(n * CHUNK_LEN));
  }
}

function show() {
  Array.prototype.forEach.call(arguments, function(elem) {
    elem.style.display = null;
  });
}

function hide() {
  Array.prototype.forEach.call(arguments, function(elem) {
    elem.style.display = 'none';
  });
}

function randomToken() {
  return Math.floor((1 + Math.random()) * 1e16).toString(16).substring(1);
}

function logError(err) {
  console.log(err.toString(), err);
}
