var Chat = function(socket){
	this.socket = socket;
};

Chat.prototype.sendMessage = function(room,text){
	var message ={
		room:room,
		text:text
	};
	this.socket.emit('message',message);
};

Chat.prototype.changeRoom = function(room){
	this.socket.emit('join',{
		newRoom:room
	});
};

Chat.prototype.processCommand = function(command){
	var words = command.split(' ');
	var command = words[0].substring(1,words[0].length).toLowerCase();  //从第一个单词解析命令
	var message = false;
	switch(command){
		case 'join':  //房间的变换和创建
			words.shift();
			var room = words.join(' ');
			this.changeRoom(room);
			break;
		case 'nick':
			words.shift();  // 更名尝试
			var name = words.join(' ');
			this.socket.emit('nameAttempt',name);
			break;
		default:   // 如果命令无法识别，返回错误信息
			message = 'Unrecognized command.';
			break;
	}
	return message;
};


