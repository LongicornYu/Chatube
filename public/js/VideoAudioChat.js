'use strict';

/****************************************************************************
* Initial setup
****************************************************************************/
var localVideo;
var remoteVideo;
var peerConnection;
var endCallButton;
var uuid;
var localStream;
var peerConnectionConfig = {
    'iceServers': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'},
    ]
};




/****************************************************************************
* Signaling server
****************************************************************************/


socket.on('ipaddr', function(ipaddr) {
  console.log('Server IP address is: ' + ipaddr);
  // updateRoomURL(ipaddr);
});

socket.on('created', function(data) {

  if(data.senderId == socket.io.engine.id)
  {
    pageReady();
  }
  else
  {

  }
});

socket.on('joined', function(data) {
  if(data.senderId == socket.io.engine.id)
  {
    pageReady();
  }
  else
  {
  }

});


socket.on('ready', function() {
  console.log('VideoSocket is ready!');
  var videoChatScreen = $("#videoChatArea");
  var chatscreen = $(".chatscreen");

  videoChatScreen.addClass('leftPanel');
  chatscreen.addClass('rightPanel');

  var videoChatInviteWait = $(".videoChatInviteWait"),
  videoChatInvite = $(".videoChatInvite"),
  section = $(".section");

  section.children().css('display', 'none');
  chatscreen.css('display','block');

  videoChatInvite.fadeOut(1200,function(){
        videoChatScreen.fadeIn(1200);
  });

  videoChatInviteWait.fadeOut(1200,function(){
        videoChatScreen.fadeIn(1200);
  });

});
socket.on('ice-message', function(message) {
  console.log("get ice message");
  gotMessageFromServer(message);
});


/****************************************************************************
* User media (webcam)
****************************************************************************/
function pageReady() {

    uuid = generateuuid();

        console.log("1");
    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');
    endCallButton = document.getElementById('videoCallEnd');
    var constraints = {
        video: true,
        audio: true,
    };

        console.log("2");
    if(navigator.mediaDevices.getUserMedia) {

          console.log("3");
        navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);

    } else {
        alert('Your browser does not support getUserMedia API');
    }
}

function getUserMediaSuccess(stream) {
    console.log("get media successfully:" + stream );
    localStream = stream;
    localVideo.src = window.URL.createObjectURL(stream);

    endCallButton.addEventListener("click", function (evt) {
      socket.emit("message",{'message':JSON.stringify({'closeConnection': 'true', 'uuid':''}), "senderId":socket.io.engine.id});
    });
}

function start(isCaller) {
    console.log("video chat started:" + isCaller);
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = iceCallback.bind({peerConnection:peerConnection, uuid:uuid});
    //peerConnection.onicecandidate = gotIceCandidate;
    peerConnection.onaddstream = gotRemoteStream;
    console.log("local stream:" + localStream);
    peerConnection.addStream(localStream);

    if(isCaller) {
        peerConnection.createOffer().then(createdDescription).catch(errorHandler);
    }
}

function iceCallback(event) {
  console.log("callback for event candidate"+event.candidate);
    if (event.candidate) {
        //var candidate = event.candidate;
        //socSend("candidate", candidate. event.target.id);     // OLD CODE
        socket.emit("message",{'message':JSON.stringify({'ice': event.candidate, 'uuid': uuid}), "senderId":socket.io.engine.id});         // NEW CODE
    }
}

function gotMessageFromServer(message) {
    console.log(
      "get message from server?"
    );

    if(!peerConnection) start(false);
    console.log(JSON.parse(message));

    var signal = JSON.parse(message);
    console.log("singal"+ signal);
    // Ignore messages from ourself
    if(signal.uuid == uuid) return;

    if(signal.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
            // Only create answers in response to offers
            if(signal.sdp.type == 'offer') {
                peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
            }
        }).catch(errorHandler);
    } else if(signal.ice) {
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
    } else if (signal.closeConnection)
    {
      endCall();
    }
}

function endCall() {
  peerConnection.close();
  localStream.getAudioTracks()[0].stop();
  localStream.getVideoTracks()[0].stop();

  localVideo.src = "";
  remoteVideo.src = "";

  var videoChatScreen = $("#videoChatArea");
  var chatscreen = $(".chatscreen");
  var section = $(".section");
  videoChatScreen.removeClass('leftPanel');
  chatscreen.removeClass('rightPanel');
  section.children().css('display', 'none');
  chatscreen.css('display','block');

};

function gotIceCandidate(event) {
  console.log("get ice candidate");
    if(event.candidate != null) {
        socket.emit("message",{'message':JSON.stringify({'ice': event.candidate, 'uuid': uuid}), 'senderId':socket.io.engine.id});
    }
    console.log("replied ice candidate"+ event.candiadate);
}

function createdDescription(description) {
    console.log('got description');

    peerConnection.setLocalDescription(description).then(function() {
        socket.emit("message",{'message':JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}), 'senderId':socket.io.engine.id});
        console.log("local description sent");
    }).catch(errorHandler);
}

function gotRemoteStream(event) {
    console.log('got remote stream');
    remoteVideo.src = window.URL.createObjectURL(event.stream);

    $("#videoTimer").toggle();
    $("#videoControlPanel").toggle();

    remoteVideo.style.display = "block";

    var sec = 0;
    function pad ( val ) { return val > 9 ? val : "0" + val; }
    setInterval( function(){
        $("#seconds").html(pad(++sec%60));
        $("#minutes").html(pad(parseInt(sec/60,10)));
    }, 1000);
}

function errorHandler(error) {
    console.log(error);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function generateuuid() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}
