var express = require('express');
var app = express();
const bodyParser = require('body-parser')
var cors = require('cors')
const {Message,ChatRoom,User} = require('./mariadb.js')
const expressJwt = require('express-jwt');
const jwt = require('jsonwebtoken');


/*{messageId: 0, nick:"vasia",message:"hello",time:1603714845689,chatRoomId:1}*/
/*const chatRooms = [{id:1, title:'green'},{id:2, title:'blue'},{id:3, title: 'orange'}]*/

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors())

const config = {
  secret: `;dtn',kznm` //тот самый секретный ключ, которым подписывается каждый токен, выдаваемый клиенту
}

function jwtWare() {
  const { secret } = config;
  return expressJwt({ secret, algorithms: ['HS256'] }).unless({ //блюдет доступ к приватным роутам
      path: [
          // public routes that don't require authentication
          '/users/authenticate',
          '/users/registration'
      ]
  });
}

function errorHandler(err, req, res, next) {
  if (typeof (err) === 'string') {
      // custom application error
      return res.status(400).json({ message: err });
  }

  if (err.name === 'UnauthorizedError') { //отлавливает ошибку, высланную из expressJwt
      // jwt authentication error
      return res.status(401).json({ message: 'Invalid Token' });
  }

  // default to 500 server error
  return res.status(500).json({ message: err.message });
}

async function authenticate({ username, password }) { //контроллер авторизации
  const user = await User.findOne({
    where:{username:username, password:password},
    attributes: { exclude: ["createdAt", "updatedAt"] }
  });
  console.log(user)
  if (user) {
      const token = jwt.sign({ sub: user.id }, config.secret); //подписывам токен нашим ключем
      return { //отсылаем интересную инфу
          token,
          ok:true
      };
  }
}

async function registration({ username, password }) { //контроллер авторизации
  const user = await User.findOne({
    where:{username:username, password:password},
    attributes: { exclude: ["createdAt", "updatedAt"] }
  });
  if (!user) {
      let newUser = await User.create({
        username: username ,
        password: password,
    })
      const token = jwt.sign({ sub: newUser.id }, config.secret); //подписывам токен нашим ключем
      return { //отсылаем интересную инфу
          token,
          ok:true
      };
  }
}

app.post('/users/authenticate', function (req, res, next) {
  authenticate(req.body)
      .then(user => user ? res.json(user) : res.status(400).json({ message: 'Username or password is incorrect' }))
      .catch(err => next(err));
});

app.post('/users/registration', function (req, res, next) {
  registration(req.body)
      .then(user => user ? res.json(user) : res.status(400).json({ message: 'This User already exist' }))
      .catch(err => next(err));
});

app.use(jwtWare());

// global error handler
app.get('/', (req, res, next) => {
  res.json({all: 'ok'})
  //next()
});

app.use(errorHandler);

app.get('/chatrooms', async function (req, res) {
  let chatRooms = await ChatRoom.findAll({
    attributes: { exclude: ["createdAt", "updatedAt"] }
  })
  res.send(chatRooms);
});

app.post('/chatroom/messages', async function (req, res) {
  let currentChatRoomMessages = await Message.findAll({
    where:{chatRoomNumber:req.body.chatRoomId},
    attributes: { exclude: ["createdAt", "updatedAt"] }
  })
  res.send(currentChatRoomMessages);
});

app.post('/messages',async function(req,res) {
    try{
        let timeStamp = `${new Date().toLocaleTimeString()}`
        let currentMessage =  await Message.create({
            nick: req.body.nick,
            message: req.body.message,
            time: timeStamp,
            chatRoomNumber: req.body.chatRoomId
        })
        res.status(201).send(currentMessage)
    }
    catch (err) {
        console.log(err)
     }
});



app.listen(8000, function () {
  console.log('Example app listening on port 8000!');
})
