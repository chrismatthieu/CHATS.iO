// node server-io.js
var http = require("http"),
  io = require('socket.io'),
  sys = require("sys"),
  fs = require("fs"),
  url = require('url'),
  nicks = {},
  rooms = {},
  ignore_uniq = false,
  allowed_domains = ["chats.nodester.com", "localhost:8764", "10.0.1.6:8764"];

var send404 = function(res) {
  res.writeHead(404);
  res.write('404');
  res.end();
};

var json = JSON.stringify;

function HTMLEncode(wText){
  if(typeof(wText)!="string"){
    wText=wText.toString();
  };
  wText=wText.replace(/</g, "&lt;") ;
  wText=wText.replace(/>/g, "&gt;") ;
  return wText;
};

function sendNicksList(client, room) {
  var n = [];
  for(key in nicks) {
    try {
      if(nicks[key] && nicks[key]["rooms"] && nicks[key]["rooms"].indexOf(room) >= 0) n.push(key + ":" + nicks[key]["nick"]);
    } catch(e) { console.log(e); } 
  } 
  broadCast(client, room, "/list " + n.join(","));
}

function broadCast(client, room, msg) {  
  var n = [];
  console.log(room);
  for(key in nicks) {
    try {
      if(nicks[key] && nicks[key]["rooms"] && nicks[key]["rooms"].indexOf(room) >= 0) {
        console.log('key:' + key + ">" + msg);
        var n = "";
        if(nicks[client.id]) n = nicks[client.id]["nick"];
        // client.send_to(key, json({ msg: HTMLEncode(msg), room: HTMLEncode(room), from: HTMLEncode(n) }));      
        client.broadcast.to(HTMLEncode(room)).emit('message', HTMLEncode(msg))
      }
    } catch(e) { console.log(e); }
  }  
}

function uniqNick(client, nick) {
  var test = true;
  for(key in nicks) {
    if(nicks[key] && nicks[key]["nick"] == nick) test = false;
  } 
  return test;
}

var httpServer = http.createServer(function(req, res) { 
  if(req.method == "HEAD") {
    res.end();
  } else {
    var path = url.parse(req.url).pathname;

    if(!/\.(js|html|swf|wav|css|png|mp3|gif)$/.test(path)){
		path = "/client-io.html";
	}
    switch (path) {
      default:
        if (/\.(js|html|swf|wav|css|png|mp3|gif)$/.test(path)){
          try {
          
            var ct = "text/html";
            var mode = "utf8";
          
            if(path.substr(-4) === '.swf') {
              ct = "application/x-shockwave-flash";
              mode = "binary";
            }
            if(path.substr(-3) === '.js') ct = "text/javascript";              
            if(path.substr(-4) === '.css') ct = "text/css";              
            if(path.substr(-4) === '.wav') {
              ct = "audio/x-wav";
              mode = "binary";
            }
            if(path.substr(-4) === '.mp3') {
              ct = "type/mpeg";
              mode = "binary";
            }
            if(path.substr(-4) === '.png') {
              ct = "image/png";
              mode = "binary";
            }
            if(path.substr(-4) === '.gif') {
              ct = "image/gif";
              mode = "binary";
            }
            res.writeHead(200, {'Content-Type': ct });
            res.write(fs.readFileSync(__dirname + path, mode), mode);
            res.end();
          } catch(e){ 
            send404(res); 
          }       
          break;
        }
        send404(res);
        break;
    }
  } 
});

// httpServer.listen(80); 
httpServer.listen(8764); 


var socket = io.listen(httpServer);

socket.on("connection", function(client){
  console.log("<"+client.id+"> connected");
  
  client.on("disconnect", function() {
  	console.log('disconnect detected');
	
    var u_rooms = [];
    if(nicks[client.id.toString()] != undefined) u_rooms = nicks[client.id.toString()]["rooms"];
    console.log("<"+client.id+"> disconnected");
    for(var room in u_rooms) {
      broadCast(client, u_rooms[room], "/quit " + client.id); 
    }
    nicks[client.id.toString()] = undefined;
 
  });
  
  client.on("message", function(message) {
  	console.log('message detected');
	
    var allowed = true;
    // for(domain in allowed_domains) {
    //   
    //   if(allowed_domains[domain] == client.request.headers.host) allowed = true;
    // }
    console.log(message);
    if(allowed) {
      var msg = message.split(" ");
	  console.log('msg:' + msg);

      switch (msg[0]) { 
        case "/whoami": 
			// nicks[client.id.toString()] = undefined;
          client.send(json({ msg: "/hello " + client.id.toString() }));
          break;
        case "/nick":
          if(ignore_uniq || uniqNick(client, msg.slice(1).join(" ").trim())) {	
            if(nicks[client.id.toString()] == undefined) nicks[client.id.toString()] = {};
            nicks[client.id.toString()]["nick"] = msg.slice(1).join(" ").trim();
            client.send(json({ msg: "/your_nick " + msg.slice(1).join(" ").trim() }));   
 console.log('msg:/your_nick');
            sendNicksList(client, msg.slice(1).join(" "));       

// ELSE IF RECONNECTED
		// } else {
		//             // if(nicks[client.id.toString()] == undefined) nicks[client.id.toString()] = {};
		// 	nicks[client.id.toString()] = {};
		//             nicks[client.id.toString()]["nick"] = msg.slice(1).join(" ").trim();
		//             client.send(json({ msg: "/your_nick " + msg.slice(1).join(" ").trim() }));   
		//             sendNicksList(client, msg.slice(1).join(" "));       
		// };

		} else {
			ignore_uniq = false;
			// client.send(json({ msg: "/notice Login " + msg.slice(1).join(" ").trim() + " already used"}));
		}

          // } else client.send(json({ msg: "/notice Login " + msg.slice(1).join(" ").trim() + " already used"}));
          break;
        case "/join":
          if(nicks[client.id.toString()] == undefined) nicks[client.id.toString()] = {};
          if(nicks[client.id.toString()]["rooms"] == undefined) nicks[client.id.toString()]["rooms"] = [];
          nicks[client.id.toString()]["rooms"].push(msg.slice(1).join(" "));
          // broadCast(client, msg.slice(1).join(" "),"/join " + nicks[client.id.toString()]["nick"] + " joined the #" + msg.slice(1).join(" ") + " room");
          client.join(msg.slice(1).join(" "))
          break;
        case "/msg":
          broadCast(client, msg[1], "/msg " + msg.slice(2).join(" "));
          break;
        case "/list":
          sendNicksList(client, msg.slice(1).join(" "));
        case "/writing":
          //broadCast(client, msg[1], "/writing " + client.id);
          break;
        case "/pm": 
          try {  
            client.send_to(msg[1], json({ msg: HTMLEncode("/msg " + msg.slice(2).join(" ")), room: HTMLEncode("/pm"), from: HTMLEncode(client.id), name: HTMLEncode(nicks[client.id]["nick"]), toname: HTMLEncode(nicks[client.id]["nick"]) }));
            client.send_to(client.id, json({ msg: HTMLEncode("/msg " + msg.slice(2).join(" ")), room: HTMLEncode("/pm"), from: HTMLEncode(client.id), name: HTMLEncode(nicks[msg[1]]["nick"]), to: msg[1], toname: HTMLEncode(nicks[client.id]["nick"]) }));
          } catch(e) { console.log(e); }
          break;
        case "/leave":
          var pos = nicks[client.id]["rooms"].indexOf(msg.slice(1).join(" "));        
          if(pos >= 0) nicks[client.id]["rooms"].splice(pos,1);
          sendNicksList(client, msg.slice(1).join(" "));
          // broadCast(client, msg.slice(1).join(" "), "/leave " + client.id);
          client.leave(msg.slice(1));
          break;
        case "/id":
          ignore_uniq = true;
          client.id = msg[1];
          client.send(json({ msg: "/your_id " + msg[1] }));          
          break;
        default: 
          break;
        break;
      } // Switch
    } // If allowed
  });
  
  client.send(json({ msg: "/hello " + client.id }));
});