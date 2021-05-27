const { Sequelize, Op, Model, DataTypes } = require('sequelize');
const sequelize = new Sequelize('newchat', 'root', null, {
    dialect: 'mariadb'
  });

const User = sequelize.define('user',{
  username: DataTypes.STRING,
  password: DataTypes.STRING
});

const Message = sequelize.define('message',{
  nick: DataTypes.STRING,
  message: DataTypes.STRING,
  time:DataTypes.STRING
});

const ChatRoom = sequelize.define('chatroom',{
  title:DataTypes.STRING
});

ChatRoom.hasMany(Message);
Message.belongsTo(ChatRoom);
User.hasMany(Message);
Message.belongsTo(User);

(async () => {
    await sequelize.sync({ force: true });
    await ChatRoom.create({title:'green'})
    await ChatRoom.create({title:'blue'})
    await ChatRoom.create({title:'orange'})
    await User.create({username:'test', password:'test'})
  })();


module.exports= {Message,ChatRoom,User};