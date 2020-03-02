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


// WB_URL = "http://localhost:8080";
// WB_WS_URL = "ws://localhost:8080/wb";
WB_URL = "http://192.168.1.101:8080";
WB_WS_URL = "ws://192.168.1.101:8080/wb";

// WB_URL = "https://imnode2.gobelieve.io";
// WB_WS_URL = "wss://imnode2.gobelieve.io/wb";

var ee = require("event-emitter");

function Conference(uid, name, room) {
    this.ws = undefined;
    this.participants = {};
    this.participantNames = [];
    this.uid = uid;
    this.name = name;
    this.room = room;
    this.pingTimer = undefined;
    this.closeTimestamp = 0;
    this.connectFailCount = 0;
    this.duration = 0;

    this.sendMessage = this.sendMessage.bind(this);
    this.ping = this.ping.bind(this);
}


Conference.prototype.start = function() {
    this.connect();
    this.pingTimer = setInterval(this.ping, 1000);
}

Conference.prototype.connect = function() {
    var self = this;

    var ws = new WebSocket(WB_WS_URL);

    ws.onmessage = function(message) {

        var parsedMessage = JSON.parse(message.data);
        console.info('Received message: ' + message.data);

        switch (parsedMessage.id) {
	    case 'existingParticipants':
	        self.onExistingParticipants(parsedMessage);
	        break;
	    case 'newParticipantArrived':
	        self.onNewParticipant(parsedMessage);
	        break;
	    case 'participantLeft':
	        self.onParticipantLeft(parsedMessage);
	        break;
        case "wb":
            eval(parsedMessage.func);
            break;
	    default:
	        console.error('Unrecognized message', parsedMessage);
        }
    }

    ws.onopen = function() {
        if (!self.uid || !self.room) {
            return;
        }
        self.register();
        self.emit("open", self);
    }

    ws.onclose = function(e) {
        console.log("websockets on close:", e.code, e.reason, e.wasClean);
        self.emit("close", self, e);
    }
    this.ws = ws;
}

Conference.prototype.register = function() {
    var message = {
        id: 'joinRoom',
        name: this.uid,
        room: this.room,
    }
    this.sendMessage(message);
}

Conference.prototype.ping = function() {
    this.duration += 1;
    var ws = this.ws;
    //检查链接是否断开
    if (!ws || ws.readyState == WebSocket.CLOSED) {
        var now = new Date().getTime();
        now = Math.floor(now / 1000);

        //失败次数越多，重连间隔的时间越长
        if (now - this.closeTimestamp > this.connectFailCount ||
            now - this.closeTimestamp > 60) {
            this.connect();
        }
        return;
    }

    if (this.duration % 10 == 0) {
        //10s发一次ping
        var message = {
            id: 'ping'
        }
        this.sendMessage(message);
    }
}

Conference.prototype.onNewParticipant = function(request) {
    this.participants[request.name] = {uid:request.name};
}

Conference.prototype.getWhiteboards = function(cb) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        //4 == DONE
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            console.log("resp:", xmlHttp.responseText);
            var respObj = JSON.parse(xmlHttp.responseText);
            cb(null, respObj);
        }
    }
    xmlHttp.open("GET", WB_URL + "/whiteboards?room="+this.room, true); // true for asynchronous
    xmlHttp.send(null);
}

Conference.prototype.onExistingParticipants = function(msg) {
    console.log(this.uid + " registered in room " + this.room);
    this.participants = {};
    var p = {uid:this.uid, name:this.name};
    this.participants[this.uid] = p;
    msg.data.forEach((sender) => {
        var p = this.participantNames.find(function(p) {
            return p.uid == sender;
        });
        var name = p ? p.name : sender;
        var p = {uid:sender, name:name};
        this.participants[sender] = p;
    });

    //this.getWhiteboards();
}

Conference.prototype.leaveRoom = function() {
    this.sendMessage({
        id: 'leaveRoom'
    });
    if (this.ws) {
        this.ws.close();
    }
    if (this.pingTimer) {
        clearInterval(this.pingTimer);
    }

    this.participants = {}
}

Conference.prototype.onParticipantLeft = function(request) {
    console.log('Participant ' + request.name + ' left');
    delete this.participants[request.name];
}

Conference.prototype.sendMessage = function(message) {
    var ws = this.ws;
    if (!ws || ws.readyState != WebSocket.OPEN) {
        console.log("websocket closed, can't send message");
        return;
    }

    var jsonMessage = JSON.stringify(message);
    console.log('Senging message: ' + jsonMessage);
    ws.send(jsonMessage);
}

ee(Conference.prototype);

module.exports = Conference;