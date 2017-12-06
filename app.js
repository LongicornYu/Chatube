// This is the main file of our chat app. It initializes a new
// express.js instance, requires the config and routes files
// and listens on a port. Start the application by running
// 'node app.js' in your terminal

const APIAI_TOKEN = '0fa7fd48b5da40c381c4342bda4215ad';
const APIAI_SESSION_ID = 'randomshit';

var express = require('express'),
 fs=require('fs'),
 https = require('https');
 app = express();

var options = {
  key: fs.readFileSync('./public/sslKeys/key.pem'),
  cert: fs.readFileSync('./public/sslKeys/cert.pem')
}

var server = https.createServer(options, app);

// This is needed if the app is run on heroku:

var port = process.env.PORT || 1024;

// Initialize a new socket.io object. It is bound to
// the express app, which allows them to coexist.

var io = require('socket.io')(server);

// Require the configuration and the routes files, and pass
// the app and io as arguments to the returned functions.


const apiai = require('apiai')(APIAI_TOKEN);


require('./config')(app, io);
require('./routes')(app, io);


io.on('connection', function(socket) {
  socket.on('chat message', (text) => {
    console.log('Message: ' + text);

    // Get a reply from API.ai

    let apiaiReq = apiai.textRequest(text, {
      sessionId: APIAI_SESSION_ID
    });

    apiaiReq.on('response', (response) => {
      let aiText = response.result.fulfillment.speech;
      console.log('Bot reply: ' + aiText);
      socket.emit('bot reply', aiText);
    });

    apiaiReq.on('error', (error) => {
      console.log(error);
    });

    apiaiReq.end();

  });
});


server.listen(port, function(){
  console.log('Your application is running on https://localhost:' + port);
});
