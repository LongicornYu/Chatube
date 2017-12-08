'use strict';

/****************************************************************************
* Initial setup
****************************************************************************/

// Create a random room if not already present in the URL.
var isInitiator;



var localVideo;
var remoteVideo;
var peerConnection;
var localStream;

var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ]
};


localVideo = document.getElementById('localVideo');
remoteVideo = document.getElementById('remoteVideo');

var constraints = {
      video: true,
      audio: true
};


/****************************************************************************
* Signaling server
****************************************************************************/

socket.on('ipaddr', function(ipaddr) {
  console.log('Server IP address is: ' + ipaddr);
  // updateRoomURL(ipaddr);
});

socket.on('created', function(clientId) {
  isInitiator = true;
  //grabWebCamVideo();

  if(navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
  } else {
      alert('Your browser does not support getUserMedia API');
  }
});

socket.on('joined', function(clientId) {
  isInitiator = false;
  //createPeerConnection(isInitiator, configuration);
  //grabWebCamVideo();

  if(navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
  } else {
      alert('Your browser does not support getUserMedia API');
  }
});

$('#start').click(function(){
    start(true);
});

socket.on('ready', function() {

  console.log('VideoSocket is ready');

  var videoChatScreen = $("#videoChatArea");
  var chatscreen = $(".chatscreen");

  videoChatScreen.addClass('leftPanel');
  chatscreen.addClass('rightPanel');

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

socket.on('message', function(message) {
  console.log('Client received message:', message);
  gotMessageFromServer();
});


function getUserMediaSuccess(stream) {
    console.log("local stream get");
    localStream = stream;
    localVideo.src = window.URL.createObjectURL(stream);
    console.log("initialtor:" +isInitiator);
}





function start(isCaller) {
    console.log("start");

    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    console.log("local strea:"+localStream);
    peerConnection.onicecandidate = gotIceCandidate;
    peerConnection.onaddstream = gotRemoteStream;
    peerConnection.addStream(localStream);

    if(isCaller) {
        peerConnection.createOffer().then(createdDescription).catch(errorHandler);
    }
}

function gotMessageFromServer() {
  console.log("getmessage");
    if(!peerConnection) start(false);

    var signal = JSON.parse(message.data);

    // Ignore messages from ourself
    if(signal.isInitiator) return;

    if(signal.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
            // Only create answers in response to offers
            if(signal.sdp.type == 'offer') {
                peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
            }
        }).catch(errorHandler);
    } else if(signal.ice) {
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
    }
}

function gotIceCandidate(event) {
    if(event.candidate != null) {
        socket.send(JSON.stringify({'ice': event.candidate, 'isInitiator': isInitiator}));
    }
}

function createdDescription(description) {
    console.log('got description');
    console.log(peerConnection.localDescription);
    console.log("isInitiator:"+isInitiator)

    peerConnection.setLocalDescription(description).then(function() {
        socket.send(JSON.stringify({'sdp': peerConnection.localDescription, 'isInitiator': isInitiator}));
    }).catch(errorHandler);
}

function gotRemoteStream(event) {
    console.log('got remote stream');
    remoteVideo.src = window.URL.createObjectURL(event.stream);

}

function errorHandler(error) {
    console.log(error);
}
