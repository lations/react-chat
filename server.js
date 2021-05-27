var express = require('express');
var app = express();
const bodyParser = require('body-parser')
const messages = [];
const chatRooms = [{id:1, title:'green'},{id:2, title:'blue'},{id:3, title: 'orange'}]
var cors = require('cors')

/*{messageId: 0, nick:"vasia",message:"hello",time:1603714845689,chatRoomId:1}*/

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors())

app.get('/chatrooms', function (req, res) {
  res.send(chatRooms);
});

app.post('/chatroom/messages', function (req, res) {
  let currentChatRoomMessages = messages.filter(x => x.chatRoomId == req.body.chatRoomId)
  res.send(currentChatRoomMessages);
});
app.post('/messages',function(req,res) {
   let timeStamp = new Date().getTime()
    req.body.time = timeStamp
    req.body.messageId = messages.length
    messages.push(req.body)
    res.status(201).send(req.body)
});


app.listen(8000, function () {
  console.log('Example app listening on port 8000!');
})
