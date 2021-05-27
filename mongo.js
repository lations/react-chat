const mongoose = require('mongoose')
var express = require('express');
var app = express();
const port = 8000;
const bodyParser = require('body-parser')
var cors = require('cors')

mongoose.connect('mongodb://localhost/mongochat', {useNewUrlParser: true});
/*{messageId: 0, nick:"vasia",message:"hello",time:1603714845689,chatRoomId:1}*/
/*const chatRooms = [{id:1, title:'green'},{id:2, title:'blue'},{id:3, title: 'orange'}]*/

var db = mongoose.connection;

var messageSchema = new mongoose.Schema({
    nick: String,
    message: String,
    time:Number,
    chatRoomId:Number
});

var chatRoomSchema = new mongoose.Schema({
    id:Number,
    title:String
});

let Message = mongoose.model('Message', messageSchema);
let ChatRoom = mongoose.model('ChatRooms',chatRoomSchema)

/*async function createChatRooms() {
  await new ChatRoom({id:1,title:'green'}).save()
  await new ChatRoom({id:2,title:'blue'}).save()
  await new ChatRoom({id:3,title:'orange'}).save()
}

createChatRooms()*/


db.on('error', console.error.bind(console, 'connection error:'));

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors())

app.get('/chatrooms', async function (req, res) {
  res.send(await ChatRoom.find());
});

app.post('/chatroom/messages', async function (req, res) {
  let currentChatRoomMessages = await Message.find({chatRoomId:req.body.chatRoomId})
  res.send(currentChatRoomMessages);
});
app.post('/messages', async function(req,res) {
   let timeStamp = new Date().getTime()
   let newMessage = new Message({nick: req.body.nick, message: req.body.message, time: timeStamp, chatRoomId: req.body.chatRoomId })
   await newMessage.save() 
   res.status(201).send(newMessage)
});


app.listen(port, function () {
  console.log(`Example app listening on port ${port}!`);
})
