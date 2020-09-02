const socket = io('localhost:3331')  // powergrid.life

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

var old_game_state = {active: false, finished: false}

// new game state
socket.on('game_state', game_state => {
    // console.log(JSON.stringify(game_state))
    
    // update messages
    game_state.messages.forEach(message => {
        // don't need to add our messages
        if (message.username !== username) {
            appendMessage(message.username.concat(": ", message.message))
        }
    })

    // render the new game_state
    render(game_state)

    // update old game state
    old_game_state = JSON.parse(JSON.stringify(game_state))
    
    // print game state
    console.log(JSON.stringify(game_state))
})

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

canvas.addEventListener('mousedown', function(e) {
    processClick(e)
})

function processClick(event) {
    if (old_game_state.players.includes(username)) {  // check not observer
        const rect = canvas.getBoundingClientRect()
        let x = event.clientX - rect.left
        let y = event.clientY - rect.top
        
        // check if in any card boxes
        // need to loop backwards for overlapping cards
        for (let i = card_boxes.length - 1; i >= 0; i--) {
            if (x < card_boxes[i].x_max && x > card_boxes[i].x_min && y < card_boxes[i].y_max && y > card_boxes[i].y_min) {
                // activate or unactivate the card
                if (cards_activated.includes(i)) {  // need to unactivate
                    cards_activated.splice(cards_activated.indexOf(i), 1)
                } else {  // need to activate
                    cards_activated.push(i)
                }

                break
            }
        }

        // check if clicking play hand button
        if (x < play_button.x_max && x > play_button.x_min && y < play_button.y_max && y > play_button.y_min) {        
            // send the message
            let message = "!play "
            let max_index = old_game_state.player_cards[username].length - 1
            cards_activated.forEach(index => {
                if (index <= max_index) {  // ignore cards that were selected before that had an index too high
                    message += old_game_state.player_cards[username][index].value.toString() + old_game_state.player_cards[username][index].color + " "
                }
            })
            message = message.slice(0, -1)

            socket.emit('chat-message', gameName, username, message)

            // un activate all cards
            cards_activated = []
        }

        // re-draw page
        render(old_game_state)
    }
}

// for clicking
var card_boxes = []
var cards_activated = []
var play_button = { x_min: 0, x_max: 0, y_min: 0, y_max: 0 }  // this will be updated

// add message to page
function appendMessage(message) {
    const messageElement = document.createElement('div')
    messageElement.innerText = message
    messageContainer.append(messageElement)
    messageContainer.scrollTop = messageContainer.scrollHeight
}

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

        // if not observer
        if (game_state.players.includes(username)) {  
            // draw cards
            drawCards(100, height - 100, width - 200, 100, game_state)

            // draw play button
            drawPlayButton(width - 100, height - 150, 50, 20)
        }

        

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

    // reset card boxes
    card_boxes = []

    for (let i = 0; i < num_cards; i++) {
        // draw the card
        // bump it up if active
        let card_y_offset = 0
        if (cards_activated.includes(i)) {  
            card_y_offset = 20
        }
        drawCard(x_offset + card_gap * i, y_offset - card_y_offset, card_width, card_height, player_cards[i])
    }

    // draw circle if up to play
    if (game_state.to_play == username) {
        ctx.fillStyle = "red"
        ctx.beginPath()
        ctx.arc(x_offset + width / 2, y_offset - 50, 10, 0, 2 * Math.PI)
        ctx.fill()
    }
}

function drawCard(x, y, width, height, card) {
    // add to card boxes
    card_boxes.push({
        x_min: x,
        x_max: x + width,
        y_min: y,
        y_max: y + height
    })

    // fill square
    ctx.fillStyle = "white"
    ctx.fillRect(x, y, width, height)

    // set font size
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

function drawPlayButton(x_offset, y_offset, width, height) {
    // update button box
    play_button = {
        x_min: x_offset,
        x_max: x_offset + width,
        y_min: y_offset,
        y_max: y_offset + height
    }

    // draw the button
    // outline
    ctx.fillStyle = "black"
    ctx.beginPath()
    ctx.rect(x_offset, y_offset, width, height)
    ctx.stroke()

    // draw text
    let font_size = Math.floor(height * .7)
    ctx.font = font_size.toString() + "px Arial"
    let text_width = ctx.measureText("Play").width
    ctx.fillText("Play", x_offset + width / 2 - text_width / 2, y_offset + height / 2 + font_size / 2)
}

function drawOpponents(x_offset, y_offset, width, height, game_state) {
    // draw direction
    // todo

    if (game_state.players.includes(username)) {  // if in game
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
    } else {  // observer
        switch (game_state.players.length) {
            case 1:
                drawBottomOpponent(width, height, game_state.players[0], game_state.num_cards[game_state.players[0]], game_state.players[0] == game_state.to_play)
                break;
            case 2:
                drawLeftOpponent(width, height, game_state.players[0], game_state.num_cards[game_state.players[0]], game_state.players[0] == game_state.to_play)
                drawRightOpponent(width, height, game_state.players[1], game_state.num_cards[game_state.players[1]], game_state.players[1] == game_state.to_play)
                break;
            case 3:
                drawLeftOpponent(width, height, game_state.players[0], game_state.num_cards[game_state.players[0]], game_state.players[0] == game_state.to_play)
                drawTopOpponent(width, height, game_state.players[1], game_state.num_cards[game_state.players[1]], game_state.players[1] == game_state.to_play)
                drawRightOpponent(width, height, game_state.players[2], game_state.num_cards[game_state.players[2]], game_state.players[2] == game_state.to_play)
                break;
            case 4:
                drawLeftOpponent(width, height, game_state.players[0], game_state.num_cards[game_state.players[0]], game_state.players[0] == game_state.to_play)
                drawTopOpponent(width, height, game_state.players[1], game_state.num_cards[game_state.players[1]], game_state.players[1] == game_state.to_play)
                drawRightOpponent(width, height, game_state.players[2], game_state.num_cards[game_state.players[2]], game_state.players[2] == game_state.to_play)
                drawBottomOpponent(width, height, game_state.players[3], game_state.num_cards[game_state.players[3]], game_state.players[3] == game_state.to_play)
                break;
        }
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

function drawBottomOpponent(width, height, opponent_username, num_cards, is_playing) {
    // draw name and num cards
    let opponent_str = opponent_username.concat(": ", num_cards)
    
    ctx.fillStyle = "black"
    ctx.font = "20px Arial"

    ctx.fillText(opponent_str, width / 2 - ctx.measureText(opponent_str).width / 2, height - 100)
    
    // draw circle if up to play
    if (is_playing) {
        ctx.fillStyle = "red"
        ctx.beginPath()
        ctx.arc(width / 2, height - 100 - 40, 10, 0, 2 * Math.PI)
        ctx.fill()
    }
}