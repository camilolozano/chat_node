/**
 * Created by Usuario on 4/08/2016.
 */
var socketio = require('socket.io');
var io;
var guestNumbers =  1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function (server) {
    io = socketio.listen(server);
    io.set('log level', 1);

    io.sockets.on('connection', function (socket) {
        guestNumbers = assignGuestName(socket, guestNumbers, nickNames, namesUsed);
        joinRoom(socket, 'Lobby');

        handleMessageBroadCasting(socket, nickNames);
        handleNameChangeAttempts(socket, nickNames);
        handreRoomJoining(socket);

        socket.on('rooms', function () {
            socket.emit('Rooms', io.sockets.manager.rooms);
        });
        handleClientDisconection(socket, nickNames, namesUsed);
    });
};

function assignGuestName(socket, guestNumbers, nickNames, namesUsed) {
    var name = 'Guest' + guestNumbers;
    nickNames[socket.id] = name;
    socket.emit('nameResult', {
        success : true,
        name : name
    });
    namesUsed.push(name);
    return guestNumbers + 1 ;
}

function joinRoom(socket, room) {
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult', {room : room});

    socket.broadcast.to(room).emit('message' , {
        text : nickNames[socket.id] + 'has joined ' + room + '.'
    });

    var usersInRoom =  io.socket.clients(room);
    if (usersInRoom.length > 1){
        var userInRoomSummary = 'users correnty  in room ' + ': ';
        for(var index in usersInRoom){
            var userSocketid = usersInRoom[index].id;
            if(userSocketid != socket.id){
                if (index > 0){
                    userInRoomSummary += ',' ;
                    userInRoomSummary += nickNames[userSocketid];
                }
            }
            userInRoomSummary += '.';
            socket.emit('message', {text : userInRoomSummary})
        }
    }
}


function handleNameChangeAttemps(socket, nicknames, namesUsed ) {
    socket.on('nameAttempt', function(name){
       if(name.indexOf('Gest') == 0) {
           socket.emit('nameResult', {
               success : true,
               message : 'Name cannot begin whit "Guest" .'
           })
       }else{
           if(namesUsed.indexOf(name) == -1){
               var previusName = nickNames[socket.id];
               var previusNameIndex = namesUsed.indexOf(previusName);
               namesUsed.push(name);
               nickNames[socket.id] = name;
               delete namesUsed[previusNameIndex];

               socket.emit('name result', {
                   success : true,
                   name : name
               });

               socket.broadcast.to(currentRoom[socket.id].emit('message', {
                   text : previusName + ' is now as: '+ mame + '.'
               }))
           }else{
               socket.emit('nameResult', {
                   success : false,
                   message : 'That name is already in use'
               });
           }
       }
    });
}

function handleMessageBroadCasting(socket) {
    socket.on('message', function (message) {
        socket.broadcast.to(message.room).emit('message',{
            text: nickNames[socket.id] + ':' + message.text
        })
    })
}

function handleRoomJoining(socket) {
    socket.on('join', function (room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}

function handleClientDisconection(socket) {
    socket.on('disconnect', function () {
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    });
}



