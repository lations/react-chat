var express = require('express');
var app = express();
const bodyParser = require('body-parser')
var cors = require('cors')
const {Message,ChatRoom,User} = require('./mariadb.js')
const expressJwt = require('express-jwt');
const jwt = require('jsonwebtoken');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const { applyMiddleware } = require('graphql-middleware')
const { rule, shield, and, or, not, allow } = require('graphql-shield')

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors())

const config = {
  secret: `;dtn',kznm` //тот самый секретный ключ, которым подписывается каждый токен, выдаваемый клиенту
}

var schema = buildSchema(`
    type Query {
        getMessages(chatroomId: Int!): [Message]
        getChatRooms: [ChatRoom]
    }

    type Mutation {
        createMessage(nick:String!, message:String!, chatroomId: Int!, userId:Int!): Message
        registration(username:String!, password:String!) : User
        authenticate(username:String!, password:String!) : User
    }

    type Message {
        id: Int
        nick: String
        message:  String
        time:   String
        chatroomId: Int
        userId: Int  
    }

    type ChatRoom {
        id: Int
        title: String
    }

    type User {
        token: String!
        ok: String!
    }
`);

  const isAuthenticated = rule({ cache: 'contextual' })(
    async (parent, args, ctx, info) => {
      if (ctx.user.sub) {
        return true
      } else {
        return false
      }
    }
  )

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
          username: username,
          password: password,
      })
        const token = jwt.sign({ sub: newUser.id }, config.secret); //подписывам токен нашим ключем
        return { //отсылаем интересную инфу
            token,
            ok:true
        };
    }
  }

async function getMessages({chatroomId}){ 
  let currentChatRoomMessages = await Message.findAll({
    where:{chatroomId:chatroomId},
    attributes: { exclude: ["createdAt", "updatedAt"] }
  })
  console.log(currentChatRoomMessages)
  return currentChatRoomMessages;
}

async function getChatRooms(){ 
  let chatRooms = await ChatRoom.findAll({
    attributes: { exclude: ["createdAt", "updatedAt"] }
  })
  return chatRooms;
}

async function createMessage({nick,message,chatroomId,userId}){ 
  try{
    let timeStamp = `${new Date().toLocaleTimeString()}`
    let currentMessage =  await Message.create({
        nick: nick,
        message: message,
        time: timeStamp,
        chatroomId: chatroomId,
        userId: userId
    })
    return currentMessage;
  }
  catch (err) {
    console.log(err)
  }
}

 var root = {
    getMessages,
    getChatRooms,
    createMessage,
    authenticate,
    registration
};

const permissions = shield({
  Query: {
    getMessages: isAuthenticated,
    getChatRooms: isAuthenticated
  },
  Mutation: {
    createMessage: isAuthenticated,
    authenticate: allow,
    registration: allow
  }  
},
{
  allowExternalErrors: allow
})


// Create an express server and a GraphQL endpoint
var app = express();
app.use(cors())

schemaWithMiddleware = applyMiddleware(schema, permissions)

app.use(
  '/graphql',
 expressJwt({ secret: `;dtn',kznm`, algorithms: ['HS256'], credentialsRequired: false }),
 graphqlHTTP((req, res) => ({ 
  schema: schemaWithMiddleware,
  rootValue: root,
  graphiql: true,
  context: {user: req.user} 
 }))
);

app.listen(8000, function () {
  console.log('Example app listening on port 8000!');
})
