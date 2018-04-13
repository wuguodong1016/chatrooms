var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server){
	io = socketio.listen(server);
	io.set('log level',1);
	io.sockets.on('connection',function(socket){
		//分配昵称
		guestNumber = assignGuestName(socket,guestNumber,nickNames,namesUsed);
		
		//在用户连接时候放入聊天室Lobby里
		joinRoom(socket,'Lobby');

		//处理用户的消息，更名，聊天室的创建和变更
		handleMessageBroadcasting(socket,nickNames);
		handleNameChangeAttempts(socket,nickNames,namesUsed);
		handleRoomJoining(socket);

		//用户发出请求时，向其提供已经被占用的聊天室的列表
		socket.on('room',function(){
			socket.emit('rooms',io.sockets.manager.rooms);
		});

		//用户断开连接后的清除逻辑
		handleClientDisconnection(socket,nickNames,namesUsed);
	});
};

//分配昵称
function assignGuestName(socket,guestNumber,nickNames,namesUsed){
	var name = 'Guest'+ guestNumber;
	nickNames[socket.id] = name;
	socket.emit('nameResult',{
		success:true,
		name:name
	});
	namesUsed.push(name);
	return guestNumber + 1;
}

//进入聊天室
function joinRoom(socket,room){
	
	//用户进入房间
	socket.join(room); 
	currentRoom[socket.id] = room;

	//让用户知道他们进入了新房间
	socket.emit('joinResult',{room:room});

	//让其他用户知道有新用户进入这个房间
	socket.broadcase.to(room).emit('message',{
		text:nickNames[socket.id]+' has joined ' + room + '.'
	});

	//确认下有哪些用户在房间里
	var usersInRoom = io.sockets.clients(room);
	if(usersInRoom.length > 1){
		var usersInRoomSummary = 'Users currently in' + room + ':';
		fro(var index in usersInRoom){
			var userSocketId = usersInRoom[index].id;
			if(userSocketId != socket.id){
				if(index > 0){
					usersInRoomSummary += ', ';
				}
			usersInRoomSummary += nickNames[userSocketId];
			}
		}
		usersInRoomSummary += '.';

		//将房间里的其他用户汇总发送给这个用户
		socket.emit('messgae',{text:usersInRoomSummary});
	}
};

function handleNameChangeAttempts(socket,nickNames,namesUsed){
	
	//添加时间监听器
	socket.on('nameAttempt',function(name){
		if(name.indexOf('Guest') == 0){
			socket.emit('nameResult',{
				success: false;
				message: 'Name cannot begin with "Guest".'
			});
		}else{
			if(namesUsed.indexOf(name) == -1){
				var preiousName = nickNames[socket.id];
				var preiousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[preiousNameIndex];  //删除之前用的昵称
				socket.emit('nameResult',{
					success :true,
					name:name
				});
				socket.broadcast.to(currentRoom[socket.id]).emit('message',{
					text:previousName + ' is now known as ' + name + '.'
				})
			}else{
				socket.emit('nameResult',{  //如果昵称被占用，发送错误信息
					success: false,
					message: 'That name is already in use.'
				})
			}
		}
	});
};

//转发消息
function handleMessageBroadcasting(socket){
	socket.on('message',function(messgae){
		socket.broadcast.to(messgae.room).emit('messgae',{
			text: nickNames[socket.id] + ': ' + messgae.text
		});
	});
}

//创建房间
function handleRoomJoining(socket){
	socket.on('join',function(room){
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket,room.newRoom);
	});
}

//用户断开连接
function handleClientDisconnection(socket){
	socket.on('disconnect',function(){
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}

