'use strict';

const socket = io();

const btnMicrophone = document.getElementById("btnMicrophone");
const iMicrophone = document.getElementById("iMicrophone");


const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

document.querySelector('button').addEventListener('click', () => {
  recognition.start();
  btnMicrophone.disabled = true;
  //outputYou.disabled = true;
  iMicrophone.className += " Blink";

});

recognition.addEventListener('speechstart', () => {
  console.log('Speech has been detected.');
});

recognition.addEventListener('result', (e) => {
  console.log('Result has been detected.');

  let last = e.results.length - 1;
  let text = e.results[last][0].transcript;

  $(".emoji-wysiwyg-editor").text(text);
  console.log('Confidence: ' + e.results[0][0].confidence);

  socket.emit('chat message', text);
});

recognition.addEventListener('speechend', () => {
  recognition.stop();
  btnMicrophone.disabled = false;
  //outputYou.disabled = false;
  iMicrophone.className = "fa fa-microphone";

});

recognition.addEventListener('error', (e) => {
  console.log('Error: ' + e.error);
  btnMicrophone.disabled = false;
  //outputYou.disabled = false;
  iMicrophone.className = "fa fa-microphone";
});

/*
function synthVoice(text) {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance();
  utterance.text = text;
  synth.speak(utterance);
}

socket.on('bot reply', function(replyText) {
  synthVoice(replyText);

  if(replyText == '') replyText = '(No answer...)';
  outputBot.textContent = replyText;
});
*/
