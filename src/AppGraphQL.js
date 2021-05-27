import './App.css';
import React, { Component } from 'react';
import {Provider, connect}   from 'react-redux';
import thunk from 'redux-thunk';
import {createStore, applyMiddleware, combineReducers} from 'redux';
import {Router, Route, Link, Switch,Redirect} from 'react-router-dom';
import createHistory from "history/createBrowserHistory";
import { GraphQLClient, gql, request } from 'graphql-request'
import jwt_decode from "jwt-decode";
import 'bootstrap/dist/css/bootstrap.min.css'
import { useCookies } from 'react-cookie';
import { withCookies, Cookies } from 'react-cookie';

const gQL = new GraphQLClient("http://localhost:8000/graphql")

const PrivateRoute = () => {
  return (
      history.push("/auth")
  )
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
      return action.chatroomId
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
  newMessage:newMessageReducer
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

function setCurrentChatRoom (chatroomId) {
  return {
    type: 'CHATROOM_SET',
    chatroomId 
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


function reg (data) {
  return (dispatch) => {
    dispatch(newMessageSending())
    const query = gql `mutation registration($username:String!, $password:String!){
      registration(username:$username, password:$password){
            token
            ok
          }
        }`
    const variables = {
          username:data.username,
          password: data.password
    }
    gQL.request(query,variables)    
    .then(response => { 
      if (response.registration.ok === "true" ) {
        localStorage.setItem ( "token", response.authenticate.token )
        localStorage.setItem ( "username", data.username )
        localStorage.setItem ( "userId", jwt_decode(response.authenticate.token).sub)      
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
    const query = gql `mutation authenticate($username:String!, $password:String!){
      authenticate(username:$username, password:$password){
            token
            ok
          }
        }`
    const variables = {
          username:data.username,
          password: data.password
    }
    gQL.request(query,variables)
    .then(response => {
      if (response.authenticate.ok === "true" ) {
        localStorage.setItem ( "token", response.authenticate.token )
        localStorage.setItem ( "username", data.username )
        localStorage.setItem ( "userId", jwt_decode(response.authenticate.token).sub) 
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

      const getQuery = gql `query getMessages($chatroomId: Int!){
        getMessages(chatroomId:$chatroomId){
              id
              nick
              message
              time
              chatroomId
              userId 
            }
          }`

      const postQuery = gql  `mutation createMessage($nick:String!, 
        $message:String!, 
        $chatroomId: Int!, 
        $userId:Int!){
          createMessage(nick:$nick, 
            message:$message, 
            chatroomId: $chatroomId, 
            userId:$userId){
              id
              nick
              message
              time
              chatroomId
              userId 
            }
          }`

          const getVariables = {
            chatroomId: data.chatroomId
          }

          const postVariables = {
            nick:data.nick,
            message: data.message,
            chatroomId: data.chatroomId,
            userId:data.userId
          }
          
          const requestHeaders = {
             'Authorization': 'Bearer ' + token
          }

          if (action == 'GET' ) { 
            gQL.request(getQuery,getVariables,requestHeaders)
            .then(response => dispatch(getChatMessage(response.getMessages)))
            .catch (response => console.error(response))
          }  
          else { 
            gQL.request(postQuery,postVariables,requestHeaders)
            .then(response =>  dispatch(newMessageSent(response.createMessage)))
            .then( () =>  dispatch(newMessageNotSending()))
            .catch (response => dispatch(newMessageFail(response)))
          }
  }
}

function fetchChatRooms (token) {
  return (dispatch) => {
    const query = gql `query getChatRooms{
      getChatRooms {
            id
            title
          }
        }`
    const variables = {}
    const requestHeaders = {
      'Authorization': 'Bearer ' + token
    } 
    gQL.request(query,variables,requestHeaders)
    .then(response => dispatch(getChatRooms(response.getChatRooms)))  
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
    setInterval( () => this.props.chatMessages({chatroomId:this.props.chatroomId}, 'GET', localStorage.getItem ( "token" )) ,2000)
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
      <input type="text" class="form-control" placeholder={this.props.placeholder} ref ={node => this.input = node} style ={style}  disabled = {disabled} name={name} onChange={this.handleChange} />
    )
  }
}

class Button extends Component {
  constructor(props) {
    super(props)
  }
  render() {
    return (
      <input type="submit" className ="btn btn-primary" onSubmit={this.handleSubmit} id="inp"/>
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
      console.log(this.props.chatroomId)
      let token = localStorage.getItem ( "token" )
      let formData = {
        nick: localStorage.getItem ( "username" ), 
        message: this.msgVal.input.value,
        chatroomId:this.props.chatroomId,
        userId: +localStorage.getItem ( "userId" )
      } 
      this.props.chatMessages(formData,'POST',token) 
    }

    render() {
      return (
        <div>
          <form onSubmit={this.handleSubmit} className="Form">
              <p>{`Nick: ${localStorage.getItem ( "username" )} `}</p>
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
    this.props.fetchChatRooms(localStorage.getItem ( "token" ))
    this.props.setCurrentChatRoom(1)
  }

  handleChange(event) {
    this.props.clearChat()
    this.props.setCurrentChatRoom(+event.target.value)
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
        <div className="container mt-5 " >
           <h1>Authorization</h1>
            <form onSubmit={this.handleSubmit} className="Form m-3 border rounded">
              <div className="d-flex flex-column align-items-start m-3">
                <label className ="form-label">Enter your nickname</label>
                <Input name ="username" aria-label="Username"  placeholder="Username" ref ={node => this.usernameVal = node} status = {this.props.status} />
              </div>
              <div className = "d-flex flex-column align-items-start m-3">
                <label className ="form-label">Enter your password</label>
                <Input name ="password" aria-label="Password" placeholder="Password" ref ={node => this.passwordVal = node}  status = {this.props.status} />
              </div>
              <div className = "d-inline-flex align-items-center justify-content-between m-3" >
                <Button />
                <div className = "d-flex m-3" >
                  <Link to='/registration'><button place className ="btn btn-primary"> Sign up-</button></Link>
                </div>
              </div>
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
        <div className="container mt-5 " >
           <h1>Registration</h1>
            <form onSubmit={this.handleSubmit} className="Form m-3 border rounded">
              <div className="d-flex flex-column align-items-start m-3">
                <label className ="form-label">Enter your nickname</label>
                <Input name ="username" aria-label="Username"  placeholder="Username" ref ={node => this.usernameVal = node} status = {this.props.status} />
              </div>
              <div className = "d-flex flex-column align-items-start m-3">
                <label className ="form-label">Enter your password</label>
                <Input name ="password" aria-label="Password" placeholder="Password" ref ={node => this.passwordVal = node}  status = {this.props.status} />
              </div>
              <div className = "d-inline-flex align-items-center justify-content-between m-3" >
                <Button />
                <div className = "d-flex m-3" >
                  <Link to='/auth'><button place className ="btn btn-primary"> Sign in</button></Link>
                </div>
              </div>
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
    localStorage.clear()
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
  chatroomId:state.currentChatRoom, 
  message:state.message,
  error:state.error,
  status:state.newMessage.status
  }) 

let mapDispatchToProps = (dispatch) => {
  return {
    fetchChatRooms: token => dispatch(fetchChatRooms(token)) ,
    chatMessages:(data,action,token) => dispatch(chatMessages(data,action,token)),
    setCurrentChatRoom: (chatroomId)=> {dispatch(setCurrentChatRoom(chatroomId))},
    clearChat: () => dispatch(clearChat()),
    auth: data => dispatch(auth(data)),
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
  if( localStorage.getItem ( "token" ) === null ) {
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
