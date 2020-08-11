const socket = io('http://localhost:3000')

const messageContainer = document.getElementById('message-container')
const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')

// Get the canvas graphics context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

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

    // render the new game_state
    render(game_state)
})

function render(game_state) {
    // wipe canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // get dims
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    const width = canvas.width
    const height = canvas.height

    if (game_state['active'] || game_state['finished']) {
        // draw the differenet aspects
        // draw current hand
        drawCurrentHand((width - ((width - 200) / 16 * 5)) / 2, height / 2 - 50, (width - 200) / 16 * 5, 100, game_state)
        console.log(width - ((width - 200) / 16 * 5) / 2)
        // draw cards
        drawCards(100, height - 100, width - 200, 100, game_state)

        // draw opponents
        drawOpponents(0, 0, width, height, game_state)
    }
}

function drawCurrentHand(x_offset, y_offset, width, height, game_state) {
    const card_width = 40
    const card_height = 60

    let current_hand = game_state.current_hand
    let num_cards = current_hand.length
    let card_gap
    if (num_cards == 1) {
        card_gap = 0
    } else {
        card_gap = (width - card_width) / (num_cards - 1)
    }
    
    for (let i = 0; i < num_cards; i++) {
        drawCard(x_offset + card_gap * i, y_offset, card_width, card_height, current_hand[i])
    }

}

function drawCards(x_offset, y_offset, width, height, game_state) {
    const card_width = 40
    const card_height = 60
    
    let player_cards = game_state.player_cards[username]
    let num_cards = player_cards.length
    let card_gap
    if (num_cards == 1) {
        card_gap = 0
    } else {
        card_gap = (width - card_width) / (num_cards - 1)
    }

    for (let i = 0; i < num_cards; i++) {
        drawCard(x_offset + card_gap * i, y_offset, card_width, card_height, player_cards[i])
    }

    // draw circle if up to play
    if (game_state.to_play == username) {
        ctx.fillStyle = "red"
        ctx.beginPath()
        ctx.arc(x_offset + width / 2, y_offset - 20, 10, 0, 2 * Math.PI)
        ctx.fill()
    }
}

function drawCard(x, y, width, height, card) {
    const font_height = width
    
    // x y is top left
    // draw outline
    ctx.fillStyle = "black"
    ctx.beginPath()
    ctx.rect(x, y, width, height)
    ctx.stroke()

    // draw number
    switch (card.color) {
        case 'g':
            ctx.fillStyle = "green"
            break
        case 'y':
            ctx.fillStyle = "yellow"
            break
        case 'r':
            ctx.fillStyle = "red"
            break
        case 'm':
            ctx.fillStyle = "black"
            break
    }
    
    ctx.font = font_height.toString().concat('px Arial')

    let text = card.value.toString()
    let text_measured = ctx.measureText(text)

    ctx.fillText(text, x + (width - text_measured.width)/ 2, y + (height + font_height) / 2)
    ctx.fillStyle = 'black'
    ctx.strokeText(text, x + (width - text_measured.width)/ 2, y + (height + font_height) / 2)
    
    ctx.fillText(card.value.toString(), x + (width - ctx.measureText(card.value.toString()))/ 2, y)
}

function drawOpponents(x_offset, y_offset, width, height, game_state) {
    // draw direction
    // todo

    let player_index = game_state.players.indexOf(username)

    let opponent_username, left_opponent_username, right_opponent_username, top_opponent_username
    switch (game_state.players.length) {
        case 2:
            // draw top
            if (player_index == 0) {
                opponent_username = game_state.players[1]
            } else {
                opponent_username = game_state.players[0]
            }
            
            drawTopOpponent(width, height, opponent_username, game_state.num_cards[opponent_username], opponent_username == game_state.to_play)
            
            break
        case 3:
            // draw left and right
            switch (player_index) {
                case 0:
                    left_opponent_username = game_state.players[1]
                    right_opponent_username = game_state.players[2]
                    break
                case 1:
                    left_opponent_username = game_state.players[2]
                    right_opponent_username = game_state.players[0]
                    break
                case 2:
                    left_opponent_username = game_state.players[0]
                    right_opponent_username = game_state.players[1]
                    break
            }
            
            drawLeftOpponent(width, height, left_opponent_username, game_state.num_cards[left_opponent_username], left_opponent_username == game_state.to_play)
            drawRightOpponent(width, height, right_opponent_username, game_state.num_cards[right_opponent_username], right_opponent_username == game_state.to_play)

            break
        case 4:
            // draw all three
            switch (player_index) {
                case 0:
                    left_opponent_username = game_state.players[1]
                    top_opponent_username = game_state.players[2]
                    right_opponent_username = game_state.players[3]
                    break
                case 1:
                    left_opponent_username = game_state.players[2]
                    top_opponent_username = game_state.players[3]
                    right_opponent_username = game_state.players[0]
                    break
                case 2:
                    left_opponent_username = game_state.players[3]
                    top_opponent_username = game_state.players[0]
                    right_opponent_username = game_state.players[1]
                    break
                case 3:
                    left_opponent_username = game_state.players[0]
                    top_opponent_username = game_state.players[1]
                    right_opponent_username = game_state.players[2]
                    break
            }
            
            drawLeftOpponent(width, height, left_opponent_username, game_state.num_cards[left_opponent_username], left_opponent_username == game_state.to_play)
            drawTopOpponent(width, height, top_opponent_username, game_state.num_cards[top_opponent_username], top_opponent_username == game_state.to_play)
            drawRightOpponent(width, height, right_opponent_username, game_state.num_cards[right_opponent_username], right_opponent_username == game_state.to_play)
    }

}

function drawTopOpponent(width, height, opponent_username, num_cards, is_playing) {
    // draw name and num cards
    let opponent_str = opponent_username.concat(": ", num_cards)
    
    ctx.fillStyle = "black"
    ctx.font = "20px Arial"

    ctx.fillText(opponent_str, width / 2 - ctx.measureText(opponent_str).width / 2, 50)
    
    // draw circle if up to play
    if (is_playing) {
        ctx.fillStyle = "red"
        ctx.beginPath()
        ctx.arc(width / 2, 70, 10, 0, 2 * Math.PI)
        ctx.fill()
    }
}

function drawLeftOpponent(width, height, opponent_username, num_cards, is_playing) {
    // draw name and num cards
    let opponent_str = opponent_username.concat(": ", num_cards)
    
    ctx.fillStyle = "black"
    ctx.font = "20px Arial"

    ctx.fillText(opponent_str, 30, (height - 100) / 2)
    
    // draw circle if up to play
    if (is_playing) {
        ctx.fillStyle = "red"
        ctx.beginPath()
        ctx.arc(10 + ctx.measureText(opponent_str).width / 2, (height - 100) / 2 + 20, 10, 0, 2 * Math.PI)
        ctx.fill()
    }
}

function drawRightOpponent(width, height, opponent_username, num_cards, is_playing) {
    // draw name and num cards
    let opponent_str = opponent_username.concat(": ", num_cards)
    
    ctx.fillStyle = "black"
    ctx.font = "20px Arial"

    ctx.fillText(opponent_str, width - 10 - ctx.measureText(opponent_str).width, (height - 100) / 2)
    
    // draw circle if up to play
    if (is_playing) {
        ctx.fillStyle = "red"
        ctx.beginPath()
        ctx.arc(width - ctx.measureText(opponent_str).width / 2 - 10, (height - 100) / 2 + 20, 10, 0, 2 * Math.PI)
        ctx.fill()
    }
}

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

