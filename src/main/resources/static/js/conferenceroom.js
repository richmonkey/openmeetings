/*
 * (C) Copyright 2014 Kurento (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

var ws;
var participants = {};
var name;
var room;
var pingTimer;

window.onbeforeunload = function() {
    ws.close();
};

function register() {
    name = document.getElementById('name').value;
    room = document.getElementById('roomName').value;
    console.log("room:", room);
    
    document.getElementById('room-header').innerText = 'ROOM ' + room;
    document.getElementById('join').style.display = 'none';
    document.getElementById('room').style.display = 'block';

    pingTimer = setInterval(ping, 10*1000);
    openWebsocket();
}

function openWebsocket() {
    if ("https:" === location.protocol) {
        ws = new WebSocket('wss://' + location.host + '/groupcall');
    } else {
        ws = new WebSocket('ws://' + location.host + '/groupcall');
    }

    ws.onopen = function (event) {
        var message = {
	    id : 'joinRoom',
	    name : name,
	    room : room,
        }
        sendMessage(message);

    };
    
    ws.onmessage = function(message) {
        var parsedMessage = JSON.parse(message.data);
        console.info('Received message: ' + message.data);

        switch (parsedMessage.id) {
	    case 'existingParticipants':
	        onExistingParticipants(parsedMessage);
	        break;
	    case 'newParticipantArrived':
	        onNewParticipant(parsedMessage);
	        break;
	    case 'participantLeft':
	        onParticipantLeft(parsedMessage);
	        break;
            case "wb":
		eval(parsedMessage.func);
                break;
	    default:
	        console.error('Unrecognized message', parsedMessage);
        }
    }

    ws.onclose = function(e) {
        console.log("websockets on close:", e.code, e.reason, e.wasClean);
        //todo exit or reconnect
    } 
}
function ping() {
    console.log("websocket state:", ws ? ws.readyState : 'null');
    if (!ws || ws.readyState == WebSocket.CLOSED) {
        openWebsocket();
        return;
    }
    
    var message = {
	id : 'ping'
    }
    sendMessage(message);    
}

function onNewParticipant(request) {
    var participant = new Participant(request.name);
    participants[request.name] = participant;    
}

function onExistingParticipants(msg) {
    console.log(name + " registered in room " + room);
    var participant = new Participant(name);
    participants[name] = participant;
    msg.data.forEach(function(name) {
        var participant = new Participant(name);
        participants[name] = participant;          
    });

    getWhiteboards();    
}

function getWhiteboards() {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        //4 == DONE
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            console.log("resp:", xmlHttp.responseText);

            var respObj = JSON.parse(xmlHttp.responseText);

            WbArea.init();
            WbArea.setRole('presenter');
            var arr = respObj.whiteboards;
            for (var i = 0; i < arr.length; i++) {
                var obj = arr[0];
                console.log("obj:", obj.wbId, obj.name, obj.width, obj.height, obj.zoom, obj.zoomMode, obj.obj);
                WbArea.create({wbId:obj.wbId, name:obj.name,
                               width:obj.width, height:obj.height,
                               zoom:obj.zoom, zoomMode:obj.zoomMode});
                
                if (obj.obj && obj.obj.length > 0) {
                    var shapes = {wbId:obj.wbId, obj:obj.obj}
                    WbArea.load(shapes);
                }
            }

            WbArea.activateWb({wbId:respObj.activeId});
            if (respObj.slide) {
                WbArea.setSlide(respObj.slide);
            }
        }
    }
    xmlHttp.open("GET", "/whiteboards?room="+room, true); // true for asynchronous 
    xmlHttp.send(null);
}

function leaveRoom() {
    sendMessage({
	id : 'leaveRoom'
    });

    participants = {}

    document.getElementById('join').style.display = 'block';
    document.getElementById('room').style.display = 'none';

    ws.close();
    clearInterval(pingTimer);
}


function onParticipantLeft(request) {
    console.log('Participant ' + request.name + ' left');
    var participant = participants[request.name];
    delete participants[request.name];
}

function sendMessage(message) {
    if (!ws || ws.readyState != WebSocket.OPEN) {
        console.log("websocket closed, can't send message");
        return;
    }    
    var jsonMessage = JSON.stringify(message);
    console.log('Senging message: ', jsonMessage.length, jsonMessage);
    ws.send(jsonMessage);
}


function wbAction(action, shape) {
    console.log("wb action:", action, shape);

    sendMessage({
	id : action,
        obj:shape
    });    
}
