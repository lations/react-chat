import './App.css';
import React, { Component } from 'react';
import {Provider, connect}   from 'react-redux';
import thunk from 'redux-thunk';
import {createStore, applyMiddleware, combineReducers} from 'redux';
import {Router, Route, Link, Switch,Redirect} from 'react-router-dom';
import createHistory from "history/createBrowserHistory";

const PrivateRoute = () => {
  return (
      history.push("/auth")
  )
}

let authorizationReducer = (state = 'USER_IS_UNAUTHORIZED' , action) => { 
  switch(action.type) {
    case 'USER_IS_UNAUTHORIZED' :
      return {authStatus:'USER_IS_UNAUTHORIZED', token: action.token, username :action.username}
    case 'USER_IS_AUTHORIZED':
      return {authStatus:'USER_IS_AUTHORIZED', token: action.token, username: action.username }
    default: 
      return state
  } 
}

let chatReducer = (state = [] , action) => { 
  switch(action.type) {
    case 'CHAT_CLEAR' :
      return []
    case 'CHAT_MESSAGES':
      return action.items
    default: 
      return state
  } 
}

let chatRoomsReducer = (state = [], action) => { 
  switch(action.type) {
    case 'ROOMS' :
      return action.chatRooms
    default: 
      return state
  }
}

let currentChatRoomReducer = (state = 1, action) => { 
  switch(action.type) {
    case 'CHATROOM_SET' :
      return action.chatRoomId
    default: 
      return state
  }
}

let newMessageReducer = (state = 'MESSAGE_NOT_SENDING', action) => { 
  switch(action.type) {
    case 'MESSAGE_NOT_SENDING' :
      return {status:'MESSAGE_NOT_SENDING'}
    case 'MESSAGE_SENDING' :
      return {status:'MESSAGE_SENDING'}
    case 'MESSAGE_SENT' :
      return {status:'MESSAGE_SENT',message:action.message}
    case 'MESSAGE_FAIL' :
      return {status:'MESSAGE_FAIL',message:action.error}
    default: 
      return state
  }
}

const reducers = combineReducers({ 
  chat:chatReducer,
  chatRooms:chatRoomsReducer,
  currentChatRoom:currentChatRoomReducer,
  newMessage:newMessageReducer,
  authorization: authorizationReducer
})

function configureStore(initialState) {
  return createStore(
      reducers,
      initialState,
      applyMiddleware(thunk)
  );
}

const store = configureStore();

store.subscribe(()=> console.log(store.getState()))

function clearChat(){
  return {
      type: 'CHAT_CLEAR'
  }
}


function getChatMessage(items){
  return {
      type: 'CHAT_MESSAGES',
      items
  }
}

function getChatRooms(chatRooms) {
  return {
    type: 'ROOMS',
    chatRooms
  }
}

function setCurrentChatRoom (chatRoomId) {
  return {
    type: 'CHATROOM_SET',
    chatRoomId 
  }
}

function newMessageSending () {
  return {
    type: 'MESSAGE_SENDING'
  }
}

function newMessageNotSending () {
  return {
    type: 'MESSAGE_NOT_SENDING'
  }
}

function newMessageSent (message) {
  return {
    type: 'MESSAGE_SENT',
    message
  }
}

function newMessageFail (error) {
  return {
    type: 'MESSAGE_FAIL',
    error
  }
}

function authFalse () {
  return {
    type: 'USER_IS_UNAUTHORIZED',
    authStatus: 'USER_IS_UNAUTHORIZED',
    token: undefined,
    username: undefined
  }
}

function authTrue (token,username) {
  return {
    type: 'USER_IS_AUTHORIZED',
    token,
    username
  }
}

function reg (data) {
  return (dispatch) => {
    dispatch(newMessageSending())
    fetch('http://localhost:8000/users/registration',{
              headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
              },
              method: 'POST',
              body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(response => { 
      if (response.ok == true ) {
        dispatch(authTrue(response.token, data.username))
        history.push("/")
      }
    })
    .then(response => dispatch(newMessageSent(response)))
    .then (() => dispatch(newMessageNotSending()))
    .catch (response => dispatch(newMessageFail(response)))
  }
}

function auth (data) {
  return (dispatch) => {
    dispatch(newMessageSending())
    fetch('http://localhost:8000/users/authenticate',{
              headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
              },
              method: 'POST',
              body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(response => { 
      if (response.ok == true ) {
        dispatch(authTrue(response.token, data.username))
        history.push("/")
      }
    })
    .then(response => dispatch(newMessageSent(response)))
    .then (() => dispatch(newMessageNotSending()))
    .catch (response => dispatch(newMessageFail(response)))
  }
}

function chatMessages (data,action,token)  {
  return (dispatch) => {
    if (action !== 'GET'){dispatch(newMessageSending())}
    fetch(action == 'GET' ?'http://localhost:8000/chatroom/messages': 'http://localhost:8000/messages',{
            headers: {
                 'Accept': 'application/json',
                 'Content-Type': 'application/json',
                 'Authorization': 'Bearer ' + token
            },
             method: 'POST',
             body: JSON.stringify(data)
         })
          .then(response => response.json())
          .then(response => action == 'GET' ? dispatch(getChatMessage(response)) : dispatch(newMessageSent(response)))
          .then( () => {
            if (action !== 'GET') {
              dispatch(newMessageNotSending())
            }
          })
          .catch (response => action == 'GET' ? console.error(response) : dispatch(newMessageFail(response)))
  }
}

function fetchChatRooms (token) {
  return (dispatch) => {
    fetch('http://localhost:8000/chatrooms',{
              headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + token
              },
              method: 'GET'
    })
    .then(response => response.json())
    .then(response => dispatch(getChatRooms(response)))  
  }
}

function ChatMessage(props){
  return <p>{props.time} : {props.nick} : {props.value} </p>
}

class Chat extends Component {
  constructor(props) {
    super(props)
  }
  componentDidMount() {
    this.props.clearChat()
    setInterval( () => this.props.chatMessages({chatRoomId:this.props.chatRoomId}, 'GET', this.props.token) ,2000)
  }

  render() {
    return (
    <div className="Chat">
      { this.props.items.length ? this.props.items.map(message => <ChatMessage key = {message.id} nick={message.nick} value={message.message} time={message.time} />) : <div>Loading...</div>}
    </div>
    )}
}

class Input extends Component {

  constructor(props) {
    super(props)
    this.handleChange = this.handleChange.bind(this)
  }

  handleChange(event) {
    this.input.value = event.target.value
  }

  render() {
    const { name } = this.props
    let disabled =  this.props.status == 'MESSAGE_SENDING' ? true : false
    let style = {backgroundColor: this.props.status == 'MESSAGE_FAIL' ? 'red' : '' };
    if (this.input) {
      if (this.props.status == 'MESSAGE_SENT') {
        this.input.value = ''
      }
    }
    return (
      <input type="text" ref ={node => this.input = node} style ={style}  disabled = {disabled} name={name} onChange={this.handleChange} />
    )
  }
}

class Button extends Component {
  constructor(props) {
    super(props)
  }
  render() {
    return (
      <input type="submit" onSubmit={this.handleSubmit} id="inp"/>
    )
  }  
}

class Form extends Component
{
    constructor(props){
     super(props)
      this.handleSubmit = this.handleSubmit.bind(this)
    }
    handleSubmit(event){
      event.preventDefault();
      let token = this.props.token
      let formData = {
        nick: this.props.username, 
        message: this.msgVal.input.value,
        chatRoomId:this.props.chatRoomId
      } 
      this.props.chatMessages(formData,'POST',token) 
    }

    render() {
      return (
        <div>
          <form onSubmit={this.handleSubmit} className="Form">
              <p>{`Nick: ${this.props.username} `}</p>
              <Input name ="message" placeholder="Message" ref ={node => this.msgVal = node}  status = {this.props.status} />
              <Button />
          </form>
        </div>
      )
    }
}

class ChatRoom extends Component {
  constructor(props) {
    super(props)
    this.handleChange = this.handleChange.bind(this)
  }
  componentDidMount() {
    this.props.fetchChatRooms(this.props.token)
    this.props.setCurrentChatRoom(1)
  }

  handleChange(event) {
    this.props.clearChat()
    this.props.setCurrentChatRoom(event.target.value)
  }
  
  render() {
    return (
      <select onChange = {this.handleChange}>
        { this.props.chatRooms.length ? this.props.chatRooms.map(room => <option value = {room.id} key ={room.id}>{room.title}</option> ) : 'Loading...' }
      </select>
    )
  }
}

class Auth extends Component
{
    constructor(props){
     super(props)
      this.handleSubmit = this.handleSubmit.bind(this)
    }
    handleSubmit(event){
      event.preventDefault();
      let formData = {
        username: this.usernameVal.input.value, 
        password: this.passwordVal.input.value,
      } 
      this.props.auth(formData) 
    }

    render() {
      return (
        <div>
          <h1>AUTHORIZTION FORM</h1>
          <form onSubmit={this.handleSubmit} className="Form">
              <Input name ="username"  placeholder="Username" ref ={node => this.usernameVal = node} status = {this.props.status} />
              <Input name ="password" placeholder="Password" ref ={node => this.passwordVal = node}  status = {this.props.status} />
              <Button />
              <Link to='/registration'>Link to registration page</Link> 
          </form>
        </div>
      )
    }
}

class Registration extends Component
{
    constructor(props){
     super(props)
      this.handleSubmit = this.handleSubmit.bind(this)
    }
    handleSubmit(event){
      event.preventDefault();
      let formData = {
        username: this.usernameVal.input.value, 
        password: this.passwordVal.input.value,
      } 
      this.props.reg(formData) 
    }

    render() {
      return (
        <div>
          <h1>REGISTRATION FORM</h1>
          <form onSubmit={this.handleSubmit} className="Form">
              <Input name ="username"  placeholder="Username" ref ={node => this.usernameVal = node} status = {this.props.status} />
              <Input name ="password" placeholder="Password" ref ={node => this.passwordVal = node}  status = {this.props.status} />
              <Button />
          </form>
        </div>
      )
    }
}

class ChatBox extends Component {
  constructor(props){
    super(props)
     this.handleClick = this.handleClick.bind(this)
  }

  handleClick (event){
    event.preventDefault();
    this.props.authFalse()
    PrivateRoute()
  }

  render() {
    return (
      <div className  = "ChatBox">
        <button onClick={this.handleClick}>Log Out...</button>
        <ConnectedForm />
        <ConnectedChatRoom/>
        <ConnectedChat/>
      </div>
    )
  }
}


let mapStateToProps = state => (
  {items:state.chat, 
  chatRooms:state.chatRooms, 
  chatRoomId:state.currentChatRoom, 
  message:state.message,
  error:state.error,
  status:state.newMessage.status,
  authStatus: state.authorization.authStatus,
  token:state.authorization.token,
  username:state.authorization.username
  }) 

let mapDispatchToProps = (dispatch) => {
  return {
    fetchChatRooms: token => dispatch(fetchChatRooms(token)) ,
    chatMessages:(data,action,token) => dispatch(chatMessages(data,action,token)),
    setCurrentChatRoom: (chatRoomId)=> {dispatch(setCurrentChatRoom(chatRoomId))},
    clearChat: () => dispatch(clearChat()),
    auth: data => dispatch(auth(data)),
    authFalse: () => dispatch(authFalse()),
    reg: data => dispatch(reg(data))
  }
};    

let ConnectedForm = connect(mapStateToProps,mapDispatchToProps)(Form) 
let ConnectedChat = connect(mapStateToProps,mapDispatchToProps)(Chat)
let ConnectedChatRoom = connect(mapStateToProps,mapDispatchToProps)(ChatRoom)
let ConnectedAuth = connect(mapStateToProps,mapDispatchToProps)(Auth)
let ConnectedRegistration = connect(mapStateToProps,mapDispatchToProps)(Registration)
let ConnectedChatBox = connect(mapStateToProps,mapDispatchToProps)(ChatBox)


let history = createHistory();

class App extends Component {
  render() {
  if(this.props.authStatus !== 'USER_IS_AUTHORIZED' ) {
    PrivateRoute()
  }
    return (
      <Provider store = {store} >
        <div className = 'App'>
          <Router history = {history}>
            <div>
              <Switch>
                <Route path="/auth" component = {ConnectedAuth} />  
                <Route exact path="/" component = {ConnectedChatBox} />
                <Route exact path="/registration" component = {ConnectedRegistration} />
              </Switch>
            </div>
          </Router>
        </div>
      </Provider>
    );
  }
}

export default App;
