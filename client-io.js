var conn_id = null;
var debug = true;
var nick = "";
var room = "main";
var rooms = {};
var numUnread = 0;
 
var nick=prompt("Please enter your name",""); 

var batches = {};


var path = location.pathname.replace( "/", "" );
if(!/\.(js|html|swf|wav|css|png)$/.test(path)){
	room = path;
}
if(room == "") room = "main";

 var socket = new io.Socket(null, {port: 8764, rememberTransport: false});
//var socket = new io.Socket(null, {port: 80, rememberTransport: false});

socket.connect();

socket.on('message', function(message){
  message = JSON.parse(message);
  var data = message.msg.split(" ");

// console.log(data[0] + '-' + data[1] + '-' + data[2]);
  
  var msg_room = "";
  if(message.room) msg_room = message.room;
  
  switch(data[0]) {
    case "/hello":
      conn_id = data[1];
      
      if(nick == ""){
		nick = "guest";
	  } 
		socket.send("/nick " + HTMLEncode(nick) + "_" + conn_id); 

      break;
    
    case "/msg":
      var text = data.slice(1).join(" ");
      if(message.room == "/pm") { // Private Message
        var id = message.to == undefined ? message.from : message.to;
        if(text != "" || message.from == conn_id) {
          if(rooms[id] == undefined) {
            rooms[id] = {};
            rooms[id]["last_user"] = "";
            rooms[id]["nb"] = 0;
            rooms[id]["type"] = "pm";
            rooms[id]["to"] = message.name;
			var fname = message.name.split("_")[0];
            try { $("#audio_new_pm")[0].play(); } catch(e) {}            
            $('#rooms ul:first-child').append("<li class='pm' id='r_" + id + "'>@" + fname + "</li>");
            addNewRoom(id);
            room = id;
          }
          if(text != "") {
            try { $("#audio_msg")[0].play(); } catch(e) {}
            if(rooms[id]["last_user"] != message.toname) {
              var date = new Date(),
                hour  = date.getHours(),
                min   = date.getMinutes();
              if(min < 10) min = "0" + min;
              rooms[id]["last_user"] = message.toname;
			  var fname = message.toname.split("_")[0];
              $('#chat_' + id).append("<div class='from'><div class='date'>"+hour+":"+min+"</div>" + fname + "</div>");
            }
           
            $('#chat_' + id).append("<div>" + HTMLEncode(text) + "</div>");
            scrollChat();
			var fname = message.name.split("_")[0];

            if(room != id) {
              addUnread();
              rooms[id]["nb"]++;
              $("#r_" + id).html("@" + fname + " (" + rooms[id]["nb"] + ")");
            } else {
              $("#r_" + id).html("@" + fname);
            }
          }
        }
      } 
      else { // Normal message
        try { $("#audio_msg")[0].play(); } catch(e) {}
        if(rooms[message.room]["last_user"] != message.from) {
          var date = new Date(),
            hour  = date.getHours(),
            min   = date.getMinutes();
          if(min < 10) min = "0" + min;
                
          rooms[message.room]["last_user"] = message.from;
		  var fname = message.from.split("_")[0];
		  var lname = message.from.split("_")[1];
		
		if(nick == message.from) 
			$('#chat_' + message.room).append("<div class='from'><div class='date'>"+hour+":"+min+"</div>" + fname + "</div>");
		else
          	$('#chat_' + message.room).append("<div class='from'><div class='date'>"+hour+":"+min+"</div><a href='#" + fname + "' onclick='socket.send(\"/pm "+ lname+"\")'>" + fname + "</a></div>");


        }

		var msgtext = HTMLEncode(data.slice(1).join(" "))
		var msgtextlinks = msgtext.replace(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/, "<a href='$1://$3' target='blank'>$1://$3</a>");


        $('#chat_' + message.room).append("<div>" + msgtextlinks + "</div>");
        // $('#chat_' + message.room).append("<div>" + HTMLEncode(data.slice(1).join(" ")) + "</div>");
        scrollChat();
        if(room != message.room) {
          addUnread();
          rooms[message.room]["nb"]++;
          $("#r_" + message.room).html(message.room + " (" + rooms[message.room]["nb"] + ")");
        } else {
          $("#r_" + message.room).html(message.room);
        }
      }
      break;
    
    case "/your_nick":
      nick = data.slice(1).join(" ");
      if(rooms[room] == undefined) {
        socket.send("/join " + room);
      } else {
        refreshList(room);
      }
      break;
    
    case "/join":
      rooms[room] = {};
      rooms[room]["last_user"] = "";
      rooms[room]["nb"] = 0;
      if(nick == message.from) {
        $('#room').html("Connected on room #" + room);
        $('#rooms ul:first-child').append("<li id='r_" + room + "'>" + room + "</li>");
        addNewRoom(room);
		var fname = nick.split("_")[0];
        notice(room, "You are connected as " + fname);
      } else {
		var fname = message.from.split("_")[0];
        batch('join_' + room, fname, function(names) {
          notice(msg_room, names + " joined this room");
        });
      }
      refreshList(room);
      
      break;
    
    case "/list":
      $('#n_' + room).html("");
      _.each(data.slice(1).join(" ").split(","), function(data) {
        n = data.split(":");
        var nh = "#n_" + room + "_" + n[0];
        var value = n[1];
		var fname = value.split("_")[0];
        
        if($(nh).html() == null) {
          if(n[1] == "undefined" || n[1] == undefined) value = n[0];
          if(n[0] == conn_id) $("#n_" + message.room).append("<div id='n_" + room + "_" +n[0]+"'>" + fname +"</div>");
          else $("#n_" + message.room).append("<div id='n_" + room + "_" +n[0]+"'><a href='#" + fname + "' onclick='socket.send(\"/pm "+ n[0]+"\")'>" + fname +"</a></div>");
        } else {
          $(nh + " a").html(fname);
          $("#r_" + n[0]).html("@" + fname);
        }
        
      });
      break;
      
    case "/quit":
      $("#n_" + msg_room + "_" + data[1]).detach();
	  var fname = message.from.split("_")[0];
      batch('part_' + msg_room, fname, function(names) {
        notice(msg_room, names + " left the room");
      });
      break;
    
    case "/leave":
      $("#n_" + msg_room + "_" + data[1]).detach();

	  var fname = message.from.split("_")[0];
      batch('part_' + msg_room, fname, function(names) {
        notice(msg_room, names + " left the room");
      });
      break;
  
    case "/writing":
      $("#n_" + msg_room + "_" + data[1]).addClass("writing");
      break;
    
    case "/notice":
      notice(msg_room, data.slice(1).join(" "));
      break;
    
    default:
      break;
  }
});

socket.on('connect', function(){
  socket.send("/whoami");
});

socket.on('disconnect', function(){
  notice(null, "You have been disconnected");
});


function send(msg) {
  var r = room;
  if(msg[0] == "/") {
    var can_send = true;
    var data = msg.split(" ");
    switch(data[0]) {
      case "/join":
        room = data[1].replace(/\W/g, "");
        msg = "/join " + room;
        can_send = nick == "" ? false : true;
        break;
      case "/leave":
        msg = msg + " " + room;
        rooms[room] = undefined;
        $('#r_' + room).detach();
        $('#n_' + room).detach();
        $("#chat_" + room).detach();
        for(var r in rooms) {
          if(rooms[r] != undefined) {
            room = r;
            displayRoom("r_" + room);
          }
          break;
        }
        break;

      break;
    }
    if(can_send) socket.send(msg);
  }
  else {
    if(nick != "") {
      var txt = '/msg ' + room + " " + msg;
      if(rooms[room].type == "pm") {
        txt = "/pm " + room + " " + msg;
      }
      socket.send(txt);     
    }
  }
  $('#t_' + r).val("");
}

function batch(type, name, callback) {
  batches[type] || (batches[type] = {names: []});
  var names = batches[type].names;
  names.push(name);
  
  if (!batches[type].timer) {
    batches[type].timer = window.setTimeout(function() {
      var nameStr;
      if (names.length > 1) {
         nameStr = names.slice(0, -1).join(', ') + ' and ' + names.slice(-1);
      }
      else {
        nameStr = names[0];
      }

      delete batches[type].timer;
      batches[type].names = [];
      callback(nameStr);
    }, 1000);
  }
}

function notice(room, msg) {
  if (room) {
    $('#chat_' + room).append("<div class='notice'>:: " + msg + "</div>");
    scrollChat();
  }
  else {
    $('.chat').each(function() {
      var chat = $(this);
      chat.append("<div class='notice'>:: " + msg + "</div>");
      chat.scrollTop(chat.scrollHeight + chat.height());
    });
  }
}

function scrollChat() {
  var log = $("#chat_" + room);
	log.scrollTop(log[0].scrollHeight + log.height());
}

function querySt(ji) {
  hu = window.location.search.substring(1);
  gy = hu.split("&");
  for (i=0;i<gy.length;i++) {
    ft = gy[i].split("=");
    if (ft[0] == ji) {
      return ft[1];
    }
  }
}

function HTMLEncode(wText){
  if(typeof(wText)!="string"){
    wText=wText.toString();
  };
  wText=wText.replace(/</g, "&lt;") ;
  wText=wText.replace(/>/g, "&gt;") ;

// emoticons
  wText=wText.replace(/:\)/g, '<img src="/public/happy.gif">') ;
  wText=wText.replace(/:-\)/g, '<img src="/public/happy.gif">') ;
  wText=wText.replace(/:\(/g, '<img src="/public/sad.gif">') ;
  wText=wText.replace(/:-\(/g, '<img src="/public/sad.gif">') ;
  wText=wText.replace(/:'\(/g, '<img src="/public/sad.gif">') ;
  wText=wText.replace(/:D/g, '<img src="/public/awesome.gif">') ;
  wText=wText.replace(/:P/g, '<img src="/public/tongue.gif">') ;
  wText=wText.replace(/:p/g, '<img src="/public/tongue.gif">') ;
  wText=wText.replace(/;\)/g, '<img src="/public/wink.gif">') ;
  wText=wText.replace(/;-\)/g, '<img src="/public/wink.gif">') ;
  wText=wText.replace(/;\//g, '<img src="/public/wink.gif">') ;
	

  return wText;
};

function displayRoom(r) {
  r = r.split("_")[1];  
  room = r;
  $(".room").css("display", "none");
  $("#rooms ul li").removeClass("active");
  $('#r_' + r).addClass("active");
  if(rooms[r]["type"] == "pm") {
	var fname = rooms[r]["to"].split("_")[0];
   	$('#r_' + r).html("@" + fname);
  } else {
	if(room.length != 16 && !IsNumeric(room)){
   		$('#r_' + r).html(r);
	}
  }  
  $('#n_' + r).html("");
  
  socket.send("/list " + r);
  $('#room_' + r).css("display", "block");
  cleanRoom(r);
  rooms[r]["nb"] = 0;
  scrollChat();
}

function refreshList(r) {
  socket.send("/list " + r);
}

function addNewRoom(r) {
  $('body').append("<div class='room' id='room_" + r + "'></div>");
  $('#room_' + r).append("<div class='chat' id='chat_" + r + "'></div>");
  $('#room_' + r).append('<form id="f_'+ r +'" action="send" method="post" onsubmit="send($(\'#t_' + r + '\').val()); return false;"></form>');
  $('#room_' + r).append("<div class='nicks' id='n_"+ r +"'></div>");
  $('#f_' + r).append('<input type="text" id="t_' + r + '" name="t" value="" width="50"  autocomplete="off"/><script>t_' + r + '.focus();</script>');
  $('#f_' + r).append('<input type="submit" value="send" />');
  $('.room').css("display","none");
  $('#r_' + r).click(function() { displayRoom(this.id) });        
  $("#rooms ul li").removeClass("active");
  $('#r_' + r).addClass("active");
  $('#room_' + r).css("display", "block");
}

socket.on('reconnect', function(){ 
	socket.send("/whoami");
});

// socket.on('reconnecting', function( nextRetry ){ message({ message: ['System', 'Attempting to re-connect to the server, next attempt in ' + nextRetry + 'ms']})});
// socket.on('reconnect_failed', function(){ message({ message: ['System', 'Reconnected to server FAILED.']})});

function IsNumeric(input)
{
   return (input - 0) == input && input.length > 0;
}

function cleanRoom(roomId) {
  numUnread -= rooms[roomId]["nb"];
  updateTitle();
}
function addUnread() {
  numUnread++;
  updateTitle();
}
function updateTitle() {
  var read = "";
  if (numUnread>0) {
  	read = "(" + numUnread + ") ";
  }
  document.title = read + "CHATS.IO";
}
$(window).keydown(function(e) {
    if (e.keyCode === 9) {
        var $t = $('#t_main'),
            nick = $('.nicks a').filter(function() {
                return $(this).text().toLowerCase().indexOf($t.val().toLowerCase()) >= 0;
            }).first().text();
        if (!!nick) {
            $t.val(nick + ': ');
        }
        return false;
    }
});