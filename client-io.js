var conn_id = null;
var debug = true;
var nick = "";
var room = "main";
var rooms = {};

var nick=prompt("Please enter your name",""); 

var path = location.pathname.replace( "/", "" );
if(!/\.(js|html|swf|wav|css|png)$/.test(path)){
	room = path;
}
if(room == "") room = "main";

// var socket = new io.Socket(null, {port: 8764, rememberTransport: false});
var socket = new io.Socket(null, {port: 80, rememberTransport: false});

socket.connect();

socket.on('message', function(message){
  message = JSON.parse(message);
  var data = message.msg.split(" ");

console.log(data[0] + '-' + data[1] + '-' + data[2]);
  
  var msg_room = "";
  if(message.room) msg_room = message.room;
  
  switch(data[0]) {
    case "/hello":
      conn_id = data[1];
      
	  // nick=prompt("Please enter your name","");
      if(nick == ""){
		nick = "Guest_";
	  } 
		socket.send("/nick " + nick + "_" + conn_id); 

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
            try { $("#audio_new_pm")[0].play(); } catch(e) {}            
            $('#rooms ul:first-child').append("<li class='pm' id='r_" + id + "'>@" + message.name + "</li>");
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
              $('#chat_' + id).append("<div class='from'><div class='date'>"+hour+":"+min+"</div>" + message.toname + "</div>");
            }
           
            $('#chat_' + id).append("<div>" + HTMLEncode(text) + "</div>");
            scrollChat();
            if(room != id) {
              rooms[id]["nb"]++;
              $("#r_" + id).html("@" + message.name + " (" + rooms[id]["nb"] + ")");
            } else {
              $("#r_" + id).html("@" + message.name);
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
          $('#chat_' + message.room).append("<div class='from'><div class='date'>"+hour+":"+min+"</div>" + message.from + "</div>");
        }
        $('#chat_' + message.room).append("<div>" + HTMLEncode(data.slice(1).join(" ")) + "</div>");
        scrollChat();
        if(room != message.room) {
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
        $('#chat_' + room).append("<div class='notice'>:: You are connected as " + nick + "</div>");
      } else {
        $('#chat_' + room).append("<div class='notice'>:: " + message.from + " joined this room</div>");
      }
      refreshList(room);
      
      break;
    
    case "/list":
      _.each(data.slice(1).join(" ").split(","), function(data) {
        n = data.split(":");
        var nh = "#n_" + room + "_" + n[0];
        var value = n[1];
        
        if($(nh).html() == null) {
          if(n[1] == "undefined" || n[1] == undefined) value = n[0];
          if(n[0] == conn_id) $("#n_" + message.room).append("<div id='n_" + room + "_" +n[0]+"'>" + value +"</div>");
          else $("#n_" + message.room).append("<div id='n_" + room + "_" +n[0]+"'><a href='#' onclick='socket.send(\"/pm "+ n[0]+"\")'>" + value +"</a></div>");
        } else {
          $(nh + " a").html(value);
          $("#r_" + n[0]).html("@" + value);
        }
        
      });
      break;
      
    case "/quit":
      $("#n_" + msg_room + "_" + data[1]).detach();
      $('#chat_' + msg_room).append("<div class='notice'>:: " + message.from + " left the room</div>");
      break;
    
    case "/part":
      $("#n_" + msg_room + "_" + data[1]).detach();
      $('#chat_' + msg_room).append("<div class='notice'>:: " + message.from + " left the room</div>");
      break;
  
    case "/writing":
      $("#n_" + msg_room + "_" + data[1]).addClass("writing");
      break;
    
    case "/notice":
      $('#chat_' +room).append("<div class='notice'>:: " + data.slice(1).join(" ") + " </div>");
      break;
    
    default:
      break;
  }
});

socket.on('connect', function(){
  socket.send("/whoami");
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
      case "/part":
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
  return wText;
};

function displayRoom(r) {
  r = r.split("_")[1];  
  room = r;
  $(".room").css("display", "none");
  $("#rooms ul li").removeClass("active");
  $('#r_' + r).addClass("active");
  if(rooms[r]["type"] == "pm") {
    $('#r_' + r).html("@" + rooms[r]["to"]);
  } else {
    $('#r_' + r).html(r);
  }  
  $('#n_' + r).html("");
  
  socket.send("/list " + r);
  $('#room_' + r).css("display", "block");
  rooms[r]["nb"] = 0;
  scrollChat();
}

function refreshList(r) {
  $('#n_' + r).html("");
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
