// This file is executed in the browser, when people visit /chat/<random id>

$(function(){

	// getting the id of the room from the url
	var id = Number(window.location.pathname.match(/\/chat\/(\d+)$/)[1]);

	// connect to the socket
	var socket = io();

	// variables which hold the data for each person
	var name = "",
		email = "",
		vartar = "",
		img = "",
		friend = "";

	// cache some jQuery objects
	var section = $(".section"),
		footer = $("footer"),
		onConnect = $(".connected"),
		inviteSomebody = $(".invite-textfield"),
		personInside = $(".personinside"),
		chatScreen = $(".chatscreen"),
		videoChatScreen = $("#videoChatArea"),
		videoChatInviteReject = $(".videoChatInviteReject"),
		videoChatInviteWait = $(".videoChatInviteWait"),
		left = $(".left"),
		noMessages = $(".nomessages"),
		videoChatInviteCancelled = $(".videoChatInviteCancelled")
		videoChatInviteOnwerCancelled = $(".videoChatInviteOnwerCancelled")
		videoChatInvite = $(".videoChatInvite");
		tooManyPeople = $(".toomanypeople");

	// some more jquery objects
	var chatNickname = $(".nickname-chat"),
		leftNickname = $(".nickname-left"),
		loginForm = $(".loginForm"),
		yourName = $("#yourName"),
		yourEmail = $("#yourEmail"),
		yourAvatar = $(".avatarSelectorImg.selected"),
		hisName = $("#hisName"),
		hisEmail = $("#hisEmail"),
		hisAvatar = $(".youravatarSelectorImg.selected"),
		chatForm = $("#chatform"),
		textarea = $(".emoji-wysiwyg-editor"),
		messageTimeSent = $(".timesent"),
		chats = $(".chats");

	// these variables hold images
	var ownerImage = $("#ownerImage"),
		leftImage = $("#leftImage"),
		topImage = $("#topImage"),
		noMessagesImage = $("#noMessagesImage");


	// on connection to server get the id of person's room
	socket.on('connect', function(){

		socket.emit('load', id);
	});

	// save the gravatar url
	socket.on('img', function(data){
		img = data;
	});

	socket.on('videoChatInvite', function(data){

		if (socket.io.engine.id != data.senderId)
		{
			showMessage("VideoChatReqest", data);
			var sound = document.getElementById("videoCallaudio", data);
			sound.loop=true;
			//sound.volume = (volume.value)/100.0;
	    	sound.play();
		}
		else
		{
			showMessage("VideoChatReqestWaiting", data);
		}
	});


	socket.on('videoChatRefused', function(senderId){

		if (socket.io.engine.id === senderId)
		{
			showMessage("VideoChatRejected");
		}
		else
		{
			showMessage("VideoChatRejectedOwner");
		}

	});

	socket.on('videoChatSelfCancel', function(senderId){

		if (socket.io.engine.id === senderId)
		{
			showMessage("VideoChatSelfCancelled");
		}
		else
		{
			var sound = document.getElementById("videoCallaudio");
			//sound.volume = (volume.value)/100.0;
			sound.pause();
			showMessage("VideoChatOwnerCancelled");
		}

	});


	socket.on('renderSnap', function(data){
		console.log("start render image");
		if (socket.io.engine.id === data.senderId)
		{
			renderPhotobuffertoArea(data.buf, true, data.user, data.img);
		}
		else
		{
			renderPhotobuffertoArea(data.buf,false,data.user, data.img);
		}

	});


	// receive the names and avatars of all people in the chat room
	socket.on('peopleinchat', function(data){

		if(data.number === 0){

			showMessage("connected");

			loginForm.on('submit', function(e){

				e.preventDefault();

				name = $.trim(yourName.val());

				if(name.length < 1){
					alert("Please enter a nick name longer than 1 character!");
					return;
				}

				email = yourEmail.val();
				vartar = $(".avatarSelectorImg.selected").attr("src");

				if(!isValid(email)) {
					alert("Please enter a valid email!");
				}
				else {

					showMessage("inviteSomebody");

					// call the server-side function 'login' and send user's parameters
					socket.emit('login', {user: name, avatar: vartar, id: id, email: email});
				}

			});
		}

		else if(data.number === 1) {

			showMessage("personinchat",data);

			loginForm.on('submit', function(e){

				e.preventDefault();

				name = $.trim(hisName.val());

				if(name.length < 1){
					alert("Please enter a nick name longer than 1 character!");
					return;
				}

				if(name == data.user){
					alert("There already is a \"" + name + "\" in this room!");
					return;
				}

				vartar = $(".youravatarSelectorImg.selected").attr("src");
				email = hisEmail.val();

				if(!isValid(email)){
					alert("Wrong e-mail format!");
				}
				else {
					socket.emit('login', {user: name, avatar: vartar, id: id, email: email});
				}

			});
		}

		else {
			showMessage("tooManyPeople");
		}

	});

	// Other useful

	socket.on('startChat', function(data){

		if(data.boolean && data.id == id) {

			chats.empty();

			if(name === data.users[0]) {

				showMessage("youStartedChatWithNoMessages",data);
			}
			else {

				showMessage("heStartedChatWithNoMessages",data);
			}

			chatNickname.text(friend);
		}
	});

	socket.on('leave',function(data){

		if(data.boolean && id==data.room){

			showMessage("somebodyLeft", data);
			chats.empty();
		}

	});


	socket.on('tooMany', function(data){

		if(data.boolean && name.length === 0) {

			showMessage('tooManyPeople');
		}
	});

	socket.on('receive', function(data){
		showMessage('chatStarted');
		var volume = document.getElementById("volume-input");

		var sound = document.getElementById("audio");
		sound.volume = (volume.value)/100.0;
    	sound.play();

    	if (!data.isImage)
    	{
			if(data.msg.trim().length) {
				createChatMessage(data.isImage,data.msg, data.user, data.img, moment());
				scrollToBottom();
			}
		}
		else
		{
			if(data.msg.trim().length) {
				createChatMessage(data.isImage, data.msg, data.user, data.img, moment());
				scrollToBottom();
			}
		}
	});

	textarea.keypress(function(e){

		// Submit the form on enter
		var keyCode = (e.which ? e.which : e.keyCode);

        if (keyCode === 10 || keyCode == 13 && e.ctrlKey) {
			e.preventDefault();
			chatForm.trigger('submit');
		}

	});

	chatForm.on('submit', function(e){

		e.preventDefault();

		// Create a new chat message and display it directly

		showMessage("chatStarted");
		if(textarea.html().trim().length) {

			if (textarea.html().includes("<img"))
			{
				createChatMessage(true,textarea.html().toString(), name, img, moment());
				scrollToBottom();

				socket.emit('msg', { isImage: true, msg: textarea.html().toString(), user: name, img: img});
			}
			else
			{
				createChatMessage(false,textarea.html(), name, img, moment());
				scrollToBottom();

				// Send the message to the other person in the chat
				socket.emit('msg', {isImage: false, msg: textarea.html(), user: name, img: img});
			}
		}
		// Empty the textarea
		textarea.text("");
	});


	$('[contenteditable]').on('keydown', function(e){
	    if(e.keyCode == 9){
	        e.preventDefault();
	        document.execCommand('insertHTML', false, '&#9;');
	    }
	}).css('white-space', 'pre');


	// Update the relative time stamps on the chat messages every minute

	setInterval(function(){

		messageTimeSent.each(function(){
			var each = moment($(this).data('time'));
			$(this).text(each.fromNow());
		});

	},60000);


	function renderPhotobuffertoArea(data,ismine, user,imgg) {
			console.log("start rendering.......");
	    var now = moment();
			var who = '';

			if(ismine!=true) {
				who = 'me';
			}
			else {
				who = 'you';
			}

			var li = $(
					'<li class=' + who + '>'+
						'<div class="image">' +
							'<img src=' + imgg + ' />' +
							'<b></b>' +
							'<i class="timesent" data-time=' + now + '></i> ' +
						'</div>' +
						'<div id="postedMessage"><p></p></div>' +
						'<div id="divpostedMessage"></div>' +
					'</li>');

			console.log(data.count);
	    var canvas = document.createElement('canvas');
	    canvas.width = 1000;
	    canvas.height = 1000;

			var canvasWidth  = canvas.width;
			var canvasHeight = canvas.height;
			var ctx = canvas.getContext('2d');
			var imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

			imageData.data.set(data);
			ctx.putImageData(imageData, 0, 0);

			// trail is the element holding the incoming images
	    li.find('p').after(canvas);
	    li.find('p').hide();

			if(who==='me')
			{
				li.find('b').text('Me');
			}
			else {
				li.find('b').text(user);
			}
			$(".chats").append(li);

			var messageTimeSent = $(".timesent");
			messageTimeSent.last().text(now.fromNow());

	}

	// Function that creates a new chat message
	function createChatMessage(isImage,msg,user,imgg,now){

		var who = '';

		if(user===name) {
			who = 'me';
		}
		else {
			who = 'you';
		}

		var li = $(
				'<li class=' + who + '>'+
					'<div class="image">' +
						'<img src=' + imgg + ' />' +
						'<b></b>' +
						'<i class="timesent" data-time=' + now + '></i> ' +
					'</div>' +
					'<div id="postedMessage"><p></p></div>' +
					'<div id="divpostedMessage"></div>' +
				'</li>');


		if (isImage)
		{
			// use the 'text' method to escape malicious user input
			li.find('p').after(msg);
			li.find('p').hide();

		}
		else
		{
			var emoji = new EmojiConvertor();
			emoji.img_set = 'apple';
			emoji.replace_mode = emoji.replace_mode;;
			emoji.text_mode = false;

			var out = emoji.replace_colons(msg);

			// use the 'text' method to escape malicious user input
			li.find('p').text(out);
		}

		if(who==='me')
		{
			li.find('b').text('Me');
		}
		else {
			li.find('b').text(user);
		}
		chats.append(li);

		messageTimeSent = $(".timesent");
		messageTimeSent.last().text(now.fromNow());

		if(msg ==='1020')
		{
			startfirework();
		}
	}

	function scrollToBottom(){
		$("html, body").animate({ scrollTop: $(document).height()-$(window).height() },1000);
	}

	function isValid(thatemail) {

		var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test(thatemail);
	}

	function showMessage(status,data){

		if(status === "connected"){

			section.children().css('display', 'none');
			onConnect.fadeIn(1200);
		}

		else if(status === "inviteSomebody"){

			// Set the invite link content
			$("#link").text(window.location.href);

			onConnect.fadeOut(1200, function(){
				inviteSomebody.fadeIn(1200);
			});
		}

		else if(status === "personinchat"){

			videoChatScreen.css("display", "none");
			onConnect.css("display", "none");
			personInside.fadeIn(1200);

			chatNickname.text(data.user);
			ownerImage.attr("src",data.avatar);
		}

		else if(status === "youStartedChatWithNoMessages") {

			left.fadeOut(1200, function() {
				inviteSomebody.fadeOut(1200,function(){
					noMessages.fadeIn(1200);
					footer.fadeIn(1200);
				});
			});

			friend = data.users[1];
			noMessagesImage.attr("src",data.avatars[1]);
		}

		else if(status === "heStartedChatWithNoMessages") {

			personInside.fadeOut(1200,function(){
				noMessages.fadeIn(1200);
				footer.fadeIn(1200);
			});

			friend = data.users[0];
			noMessagesImage.attr("src",data.avatars[0]);
		}

		else if(status === "chatStarted"){
			if (videoChatScreen.css('display') != "none")
			{
				section.children().css('display','none');
				videoChatScreen.css('display','block');
			}else {
				section.children().css('display','none');
				videoChatScreen.css('display','none');
			}

			chatScreen.css('display','block');
		}

		else if(status === "somebodyLeft"){

			leftImage.attr("src",data.avatar);
			leftNickname.text(data.user);

			section.children().css('display','none');
			footer.css('display', 'none');
			left.fadeIn(1200);
		}

		else if(status === "tooManyPeople") {

			section.children().css('display', 'none');
			tooManyPeople.fadeIn(1200);
		}

		else if (status === "VideoChatReqest") {
			section.children().css('display', 'none');
			chatScreen.css('display','block');
			topImage.attr("src",data.avatar);
			videoChatInvite.fadeIn(1200);
		}
		else if (status === "VideoChatReqestWaiting") {
			section.children().css('display', 'none');
			chatScreen.css('display','block');
			videoChatInviteWait.fadeIn(1200);

		}
		else if (status === "VideoChatRejectedOwner") {
			section.children().css('display', 'none');
			chatScreen.css('display','block');
			videoChatInviteReject.fadeIn(1200);
		}
		else if (status === "VideoChatRejected") {
			section.children().css('display', 'none');
			chatScreen.css('display','block');
			videoChatInvite.fadeOut(1200);
		}
		else if (status === "VideoChatSelfCancelled") {
			section.children().css('display', 'none');
			chatScreen.css('display','block');
			videoChatInvite.fadeOut(1200);
			videoChatInviteOnwerCancelled.fadeIn(1200);
		}
		else if (status === "VideoChatOwnerCancelled") {
			section.children().css('display', 'none');
			chatScreen.css('display','block');
			videoChatInviteWait.fadeOut(1200);
			videoChatInviteCancelled.fadeIn(1200);
		}
	}
});
