const socket = io('http://localhost:3000')

const messageContainer = document.getElementById('message-container')
const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')

// send connection message
socket.emit('game_connection', gameName, username)
console.log('connected using game conneciton')

console.log(gameName, username)

// new game state
socket.on('game_state', game_state => {
    console.log(JSON.stringify(game_state))
    
    // update messages
    game_state.messages.forEach(message => {
        // don't need to add our messages
        if (message.username !== username) {
            appendMessage(message.username.concat(": ", message.message))
        }
    })
})

// add message to page
function appendMessage(message) {
    const messageElement = document.createElement('div')
    messageElement.innerText = message
    messageContainer.append(messageElement)
}

// send messge
messageForm.addEventListener('submit', e => {
    e.preventDefault()
    let message = messageInput.value
    
    // send message
    if (message != "") {
        socket.emit('chat-message', gameName, username, message)

        // add message to chat
        appendMessage(username.concat(": ", message))

        // reset input bar
        messageInput.value = ''
    }
})
