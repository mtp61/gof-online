const socket = io('http://localhost:3000')

const messageContainer = document.getElementById('message-container')
const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')

// send connection message
socket.emit('game_connection', gameName, username) // gamename, username
console.log('connected using game conneciton')

console.log(gameName, username)

// new game state
socket.on('game_state', game_state => {
    console.log('new game state')
    
    // update messages
    game_state['messages'].forEach(message => {
        appendMessage(message)
    })
})

// send messge
messageForm.addEventListener('submit', e => {
    e.preventDefault()
    const message = messageInput.value
    if (message != "") {
        socket.emit('chat-message', gameName, username, message)
    }
    messageInput.value = ''
})


// add message to page
function appendMessage(message) {
    const messageElement = document.createElement('div')
    messageElement.innerText = message
    messageContainer.append(messageElement)
  }