'use strict';

/****************************************************************************
* Initial setup
****************************************************************************/
var localAudio;
var remoteAudio;
var peerConnection;
var endAudioButton;
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

socket.on('audiocreated', function(data) {

  if(data.senderId == socket.io.engine.id)
  {
    AudioPageReady();
  }
  else
  {

  }
  console.log(1);
});

socket.on('audiojoined', function(data) {
  if(data.senderId == socket.io.engine.id)
  {
    AudioPageReady();
  }
  else
  {
  }

});


socket.on('audioready', function() {
  console.log('AudioSocket is ready!');
  var audioChatScreen = $("#audioChatArea");
  var chatscreen = $(".chatscreen");

  audioChatScreen.addClass('leftPanel');
  chatscreen.addClass('rightPanel');

  var audioChatInviteWait = $(".audioChatInviteWait"),
  audioChatInvite = $(".audioChatInvite"),
  section = $(".section");

  section.children().css('display', 'none');
  chatscreen.css('display','block');

  audioChatInvite.fadeOut(1200,function(){
        audioChatScreen.fadeIn(1200);
  });

  audioChatInviteWait.fadeOut(1200,function(){
        audioChatScreen.fadeIn(1200);
  });

});

socket.on('ice-message-audio', function(message) {
  console.log("get ice message");
  gotMessageFromAudioServer(message);
});


/****************************************************************************
* User media (webcam)
****************************************************************************/
function AudioPageReady() {

    uuid = generateuuid();

    localAudio = document.getElementById('localAudio');
    remoteAudio = document.getElementById('remoteAudio');
    endAudioButton = document.getElementById('AudioCallEnd');

    console.log(endAudioButton);
    var Audioconstraints = {
        video: false,
        audio: true,
    };

    if(navigator.mediaDevices.getUserMedia) {

        navigator.mediaDevices.getUserMedia(Audioconstraints).then(getUserAudioMediaSuccess).catch(errorHandler);

    } else {
        alert('Your browser does not support getUserMedia API');
    }
}

function getUserAudioMediaSuccess(stream) {
    console.log("get media successfully:" + stream );
    localStream = stream;
    localAudio.src = window.URL.createObjectURL(stream);

    endAudioButton.addEventListener("click", function (evt) {
      socket.emit("message-audio",{'message':JSON.stringify({'closeConnection': 'true', 'uuid':''}), "senderId":socket.io.engine.id});
    });
}

function startAudio(isCaller) {
    console.log("audio chat started:" + isCaller);
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = iceaudioCallback.bind({peerConnection:peerConnection, uuid:uuid});
    //peerConnection.onicecandidate = gotIceCandidate;
    peerConnection.onaddstream = gotAudioRemoteStream;
    console.log("local stream:" + localStream);
    peerConnection.addStream(localStream);

    if(isCaller) {
        peerConnection.createOffer().then(createdAudioDescription).catch(errorHandler);
    }
}

function iceaudioCallback(event) {
  console.log("callback for event candidate"+event.candidate);
    if (event.candidate) {
        //var candidate = event.candidate;
        //socSend("candidate", candidate. event.target.id);     // OLD CODE
        socket.emit("message-audio",{'message':JSON.stringify({'ice': event.candidate, 'uuid': uuid}), "senderId":socket.io.engine.id});         // NEW CODE
    }
}

function gotMessageFromAudioServer(message) {
    console.log(
      "get message from server?"
    );

    if(!peerConnection) startAudio(false);
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
      endAudioCall();
    }
}

function endAudioCall() {
  peerConnection.close();
  localStream.getAudioTracks()[0].stop();

  localAudio.src = "";
  remoteAudio.src = "";

  var audioChatScreen = $("#audioChatArea");
  var chatscreen = $(".chatscreen");
  var section = $(".section");
  audioChatScreen.removeClass('leftPanel');
  chatscreen.removeClass('rightPanel');
  section.children().css('display', 'none');
  chatscreen.css('display','block');

  $('.action').css('pointer-events', '');
};

function gotIceCandidate(event) {
  console.log("get ice candidate");
    if(event.candidate != null) {
        socket.emit("message-audio",{'message':JSON.stringify({'ice': event.candidate, 'uuid': uuid}), 'senderId':socket.io.engine.id});
    }
    console.log("replied ice candidate"+ event.candiadate);
}

function createdAudioDescription(description) {
    console.log('got description');

    peerConnection.setLocalDescription(description).then(function() {
        socket.emit("message-audio",{'message':JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}), 'senderId':socket.io.engine.id});
        console.log("local description sent");
    }).catch(errorHandler);
}

function gotAudioRemoteStream(event) {
    console.log('got remote stream');
    remoteAudio.src = window.URL.createObjectURL(event.stream);

    $("#audioTimer").toggle();
    $("#audioControlPanel").toggle();

    remoteAudio.style.display = "block";

    var sec = 0;
    function pad ( val ) { return val > 9 ? val : "0" + val; }
    setInterval( function(){
        $("#seconds").html(pad(++sec%60));
        $("#minutes").html(pad(parseInt(sec/60,10)));
    }, 1000);

        var paths = document.getElementsByTagName('path');
        var visualizer = document.getElementById('visualizer');
        var mask = visualizer.getElementById('mask');
        var path;
        var report = 0;

        window.persistAudioStream = event.stream;
        var audioContent = new AudioContext();
        var audioStream = audioContent.createMediaStreamSource( event.stream );
        var analyser = audioContent.createAnalyser();
        audioStream.connect(analyser);
        analyser.fftSize = 1024;

        var frequencyArray = new Uint8Array(analyser.frequencyBinCount);
        visualizer.setAttribute('viewBox', '0 0 255 255');

				//Through the frequencyArray has a length longer than 255, there seems to be no
        //significant data after this point. Not worth visualizing.
        for (var i = 0 ; i < 255; i++) {
            path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('stroke-dasharray', '4,1');
            mask.appendChild(path);
        }
        var doDraw = function () {
            requestAnimationFrame(doDraw);
            analyser.getByteFrequencyData(frequencyArray);
          	var adjustedLength;
            for (var i = 0 ; i < 255; i++) {
              	adjustedLength = Math.floor(frequencyArray[i]) - (Math.floor(frequencyArray[i]) % 5);
                paths[i].setAttribute('d', 'M '+ (i) +',255 l 0,-' + adjustedLength);
            }

        }
        doDraw();
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
