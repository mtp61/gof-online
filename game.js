const _ = require('lodash');
const { use } = require('passport');

class Game {
    constructor(gameName) {
        this.gameName = gameName;

        this.creation_time = Date.now()

        this.player_sockets = {}
        this.observer_sockets = {}
        this.message_queue = []
        this.personal_messages = {}

        this.CONSTANTS = {
            MIN_PLAYERS: 1  // todo make 3
        }

        this.resetGame()
    }

    resetGame() {
        // reset game state
        this.game_state = {
            players: [],
            active: false,
            finished: false,
            num_passes: 0
        }
        
        // shuffle deck
        let cards = [
            {color: 'g', value: 1},
            {color: 'g', value: 1},
            {color: 'y', value: 1},
            {color: 'y', value: 1},
            {color: 'r', value: 1},
            {color: 'r', value: 1},
            {color: 'm', value: 1},
            {color: 'g', value: 2},
            {color: 'g', value: 2},
            {color: 'y', value: 2},
            {color: 'y', value: 2},
            {color: 'r', value: 2},
            {color: 'r', value: 2},
            {color: 'g', value: 3},
            {color: 'g', value: 3},
            {color: 'y', value: 3},
            {color: 'y', value: 3},
            {color: 'r', value: 3},
            {color: 'r', value: 3},
            {color: 'g', value: 4},
            {color: 'g', value: 4},
            {color: 'y', value: 4},
            {color: 'y', value: 4},
            {color: 'r', value: 4},
            {color: 'r', value: 4},
            {color: 'g', value: 5},
            {color: 'g', value: 5},
            {color: 'y', value: 5},
            {color: 'y', value: 5},
            {color: 'r', value: 5},
            {color: 'r', value: 5},
            {color: 'g', value: 6},
            {color: 'g', value: 6},
            {color: 'y', value: 6},
            {color: 'y', value: 6},
            {color: 'r', value: 6},
            {color: 'r', value: 6},
            {color: 'g', value: 7},
            {color: 'g', value: 7},
            {color: 'y', value: 7},
            {color: 'y', value: 7},
            {color: 'r', value: 7},
            {color: 'r', value: 7},
            {color: 'g', value: 8},
            {color: 'g', value: 8},
            {color: 'y', value: 8},
            {color: 'y', value: 8},
            {color: 'r', value: 8},
            {color: 'r', value: 8},
            {color: 'g', value: 9},
            {color: 'g', value: 9},
            {color: 'y', value: 9},
            {color: 'y', value: 9},
            {color: 'r', value: 9},
            {color: 'r', value: 9},
            {color: 'g', value: 10},
            {color: 'g', value: 10},
            {color: 'y', value: 10},
            {color: 'y', value: 10},
            {color: 'r', value: 10},
            {color: 'r', value: 10},
            {color: 'g', value: 11},
            {color: 'y', value: 11},
            {color: 'r', value: 11}            
        ]
        this.deck = []
        while (cards.length > 0) {
            let rand_num = Math.floor(Math.random() * cards.length)
            this.deck.push(cards[rand_num])
            cards.splice(rand_num, 1)
        }
    }

    update() {
        this.game_state.messages = []

        // setup personal messages
        this.personal_messages = {}
        this.game_state.players.forEach(username => {
            this.personal_messages[username] = []
        })
        

        // parse messages
        this.message_queue.forEach(message_obj => {
            let message = message_obj.message
            let username = message_obj.username
            
            // process message
            // check if message is command
            if (message.slice(0, 1) === "!") {
                if (!this.game_state.finished) {
                    // process command
                    let args = message.split(" ")
                    let command = args[0].slice(1)
                    switch(command) {
                        case "ready":
                            if (this.game_state.active) {  // game already active
                                this.personalMessage(username, 'The game is already full')
                                break
                            }

                            if (this.game_state.players.includes(username)) {  // user already in game
                                this.personalMessage(username, "You're already in the game")
                                break
                            }

                            if (this.game_state.players.length >= 4) {  // no space in game
                                this.personalMessage(username, "Can't ready when the game is in progress")
                                break
                            }

                            
                            // add to game state
                            this.game_state.players.push(username)

                            // get socket id from observer sockets
                            let socket_id, socket
                            Object.keys(this.observer_sockets).forEach(id => {
                                if (this.observer_sockets[id].username === username) {
                                    socket_id = id
                                    socket = this.observer_sockets[id].socket
                                }
                            })

                            // add as player socket
                            this.player_sockets[socket_id] = { socket: socket, username: username}

                            // remove observer socket
                            delete this.observer_sockets[socket_id]

                            this.serverMessage(username.concat(" joined the game"))                        
                            break
                        
                        case "start":
                            // make sure game not already active
                            if (this.game_state.active) {
                                this.personalMessage(username, 'Game already active')
                                break
                            }

                            // make sure player has readied
                            if (!this.game_state.players.includes(username)) {
                                this.personalMessage(username, 'Only players who have joined can start the game')
                                break
                            }

                            // need at least min players
                            if (this.game_state.players.length < this.CONSTANTS.MIN_PLAYERS) {
                                this.personalMessage(username, 'There are not enough players to start the game')
                                break
                            }

                            // start the game
                            this.game_state.active = true
                            
                            // deal the cards
                            this.game_state.player_cards = {}
                            let player_num = 0
                            this.game_state.players.forEach(username => {
                                // give 16 cards
                                this.game_state.player_cards[username] = this.deck.slice(16 * player_num, 16 * (player_num + 1))

                                // sort the cards
                                this.game_state.player_cards[username] = this.sortHand(this.game_state.player_cards[username])

                                player_num++
                            })

                            // assign first player
                            let num_players = this.game_state.players.length
                            this.game_state.to_play = this.game_state.players[Math.floor(Math.random() * num_players)]

                            // determine order todo make random
                            this.game_state.standard_order = true
                            
                            // current hand is nothing
                            this.game_state.current_hand = []

                            // send message to players
                            let start_message = "Game starting with players "
                            this.game_state.players.forEach(username => {
                                start_message = start_message.concat(username, ', ')
                            })
                            this.serverMessage(start_message.slice(0, -2))

                            break
                        
                        case "play": // play a hand
                            // check that user is a player
                            if (!this.game_state.players.includes(username)) {
                                this.personalMessage(username, 'You are not in the game')
                                break
                            }

                            // check that user is up to play
                            if (this.game_state.to_play != username) {
                                this.personalMessage(username, "It's not your turn")
                                break
                            }

                            // check that all inputs are cards in the users hand
                            let hand = []
                            let input_error = false
                            args.slice(1).forEach(arg => {
                                if (arg.length == 2 || arg.length == 3) {  // check length
                                    let color = arg.slice(-1)
                                    let value = parseInt(arg.slice(0, -1))

                                    // check color
                                    if (['g', 'y', 'r', 'm'].includes(color)) {
                                        // check number
                                        if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].includes(value)) {
                                            // check in hand
                                            if (this.game_state.player_cards[username].some(card => card.color == color && card.value == value)) {
                                                // add card to hand
                                                hand.push({color: color, value: value})
                                            } else {
                                                this.personalMessage(username, arg.concat(' is not in your hand'))
                                                input_error = true
                                            }
                                        } else {
                                            this.personalMessage(username, arg.concat(' is not a card'))
                                            input_error = true
                                        }
                                    } else {
                                        this.personalMessage(username, arg.concat(' is not a card'))
                                        input_error = true
                                    }
                                } else {
                                    this.personalMessage(username, arg.concat(' is not a card'))
                                    input_error = true
                                }
                            })

                            if (input_error) {
                                break
                            }

                            // check if the hand is legal and wins
                            switch (this.canPlayHand(hand, this.game_state.current_hand)) {
                                case 1:  // can play hand
                                    // message users
                                    if (hand.length == 0) {  // if the user passed
                                        this.serverMessage(username.concat(' passed'))
                                    } else {
                                        // sort hand
                                        hand = this.sortHand(hand)

                                        let hand_string = ""
                                        hand.forEach(card => {
                                            hand_string += card.value.toString() + card.color + ' '
                                        })
                                        this.serverMessage(username.concat(' played ', hand_string))
                                    }
                                    
                                    // update current hand
                                    this.game_state.current_hand = _.cloneDeep(hand)

                                    // remove cards from player's hand
                                    hand.forEach(card => {
                                        let card_index
                                        for (let i = 0; i < this.game_state.player_cards[username].length; i++) {
                                            if (this.game_state.player_cards[username][i].value == card.value && 
                                                this.game_state.player_cards[username].color == this.game_state.player_cards[username].color) {
                                                card_index = i
                                                break
                                            }
                                        }

                                        this.game_state.player_cards[username].splice(card_index, 1)
                                    })
        
                                    // look at pass
                                    if (hand.length == 0) {  // if pass
                                        this.game_state.num_passes++
                                        if (this.game_state.num_passes >= this.game_state.players.length - 1) {
                                            // reset num passes
                                            this.game_state.num_passes = 0
                                            
                                            // current hand goes to play anything
                                            this.game_state.current_hand = []

                                            this.serverMessage("All other players passed, board cleared")
                                        }
                                    }

                                    // check to see if game is over
                                    if (this.game_state.player_cards[username].length == 0) {
                                        this.game_state.active = false
                                        this.game_state.finished = true

                                        this.serverMessage(username.concat(' wins the game'))

                                        break
                                    }

                                    // next player is up
                                    this.nextPlayer()                                

                                    break

                                case 0:
                                    this.personalMessage(username, "Hand is too weak")
                                    break

                                case -1:
                                    this.personalMessage(username, "Hand invalid")
                            }

                            break

                        default:
                            this.personalMessage(username, "Command not regognized")
                    }
                } else {
                    this.serverMessage('no commands after the game has finished')
                }
                
            } else {
                // add message to game state (commands not sent to other people)
                this.game_state.messages.push({username: username, message: message})
            }
            
            // reset message queue
            this.message_queue = []
        })

        // send game states        
        // update number of cards
        if (this.game_state.active) {
            this.game_state.num_cards = {}
            this.game_state.players.forEach(username => {
                this.game_state.num_cards[username] = this.game_state.player_cards[username].length
            })
        }
        
        Object.keys(this.player_sockets).forEach(socket_id => {
            let player_game_state = _.cloneDeep(this.game_state)
            
            // add personal messages
            if (Object.keys(this.personal_messages).includes(this.player_sockets[socket_id].username)) {
                this.personal_messages[this.player_sockets[socket_id].username].forEach(message => {
                    player_game_state.messages.push(message)
                })
            }

            if (this.game_state.active) {
                // remove other players cards
                this.game_state.players.forEach(username => {            
                    if (username != this.player_sockets[socket_id].username) {  // not the socket user
                        delete player_game_state.player_cards[username]
                    }
                })
            }

            this.player_sockets[socket_id].socket.emit('game_state', player_game_state)
        })

        Object.keys(this.observer_sockets).forEach(socket_id => {
            this.observer_sockets[socket_id].socket.emit('game_state', this.game_state)
        })
    }

    newConnection(socket, username) {
        this.observer_sockets[socket.id] = { socket: socket, username: username }
    }

    serverMessage(message) {
        this.game_state.messages.push({username: "Server", message: message})
    }

    personalMessage(username, message) {
        this.personal_messages[username].push({username: "Server", message: message})
    }

    sortHand(hand) {
        return hand.sort((card1, card2) => {
            switch (Math.sign(card1.value - card2.value)) {
                case 1:
                    return 1

                case -1:
                    return -1

                case 0:
                    if (card1.color == card2.color) {
                        return 0
                    } else if (card1.color == 'm') {
                        return 1
                    } else if (card2.color == 'm') {
                        return -1
                    } else if (card1.color == 'r') {
                        return 1
                    } else if (card2.color == 'r') {
                        return -1
                    } else if (card1.color == 'y') {
                        return 1
                    } else {
                        return -1
                    }
            }
        })
    }

    nextPlayer() {  // sets up the next player in the rotation as to_play
        let current_index = this.game_state.players.indexOf(this.game_state.to_play)

        if (this.game_state.standard_order) {  // next index
            current_index++
        } else {
            current_index--
        }

        if (current_index < this.game_state.players.length) {
            this.game_state.to_play = this.game_state.players[current_index]
        } else {
            this.game_state.to_play = this.game_state.players[0]
        }

        // message player
        this.personalMessage(this.game_state.to_play, "It's your turn to play")
    }

    canPlayHand(hand_new, hand_old) {  // returns 1 if the new hand can beat the old hand, 0 if the hand is not better, -1 if the hand is not legal
        // check pass
        if (hand_new.length == 0) {
            return 1
        }
        
        // check hand legal
        let hand_new_score = this.handToScore(hand_new)

        if (hand_new_score == -1) {
            return -1
        }

        let hand_old_score = this.handToScore(hand_old)
        
        // todo score threshold
        if (hand_new.length == hand_old.length || hand_new_score >= 1000 || hand_old.length == 0) {  // check same number of cards or hand is a gang (above certain score)
            if (hand_new_score > hand_old_score) {
                return 1
            }
            return 0
        }
        return -1
    }

    handToScore(hand) {  // converts hand to a value number or -1 if it is not a legal hand
        let score
        switch (hand.length) {
            case 0:  // pass or empty board
                return 0

            case 1:  // single
                score = hand[0].value
                switch (hand[0].color) {
                    case 'y':
                        score += .1
                        break
                    case 'r':
                        score += .2
                        break
                    case 'm':
                        score += .3
                        break
                }
                return score

            case 2:  // pair
                // make sure cards are the same
                if (hand[0].value != hand[1].value) {
                    return -1
                }

                // make sure dragon not in pair
                if ((hand[0].value == 11 && hand[0].color == 'r') || (hand[1].value == 11 && hand[1].color == 'r')) {
                    return -1
                }

                score = hand[0].value
                hand.forEach(card => {
                    switch (card.color) {
                        case 'm':
                            return 12.5

                        case 'r':
                            score += .2
                            break
                        
                        case 'y':
                            score += .1
                    }
                })
                
                return score

            case 3: // three of a kind
                // make sure cards are the same
                if (!(hand[0].value == hand[1].value && hand[0].value == hand[2].value)) {
                    return -1
                }

                // make sure not pheonix/drag
                if (hand[0].value == 11) {
                    return -1
                }
                
                score = hand[0].value
                hand.forEach(card => {
                    switch (card.color) {
                        case 'm':
                            return 23.9

                        case 'r':
                            score += .3
                            break
                        
                        case 'y':
                            score += .1
                    }
                })
                
                return score

            case 4:  // gang of 4
                // make sure cards are the same
                if (!(hand[0].value == hand[1].value &&
                    hand[0].value == hand[2].value &&
                    hand[0].value == hand[3].value)) {
                    return -1
                }
                
                score = 1000 + hand[0].value

                return score

            case 5:  // 5 card poker hand or gang of 5
                // gang of 5
                if (hand[0].value == hand[1].value &&
                    hand[0].value == hand[2].value &&
                    hand[0].value == hand[3].value &&
                    hand[0].value == hand[4].value) {
                    score = 1100 + hand[0].value
                    
                    return hand
                }

                // check straight, scores from 
                let is_straight = true
                hand = this.sortHand(hand)

                let starting_value = hand[0].value
                if (hand[4].value != 11) {  // no pheonix/drag in straight
                    for (let i = 1; i < 5; i++) {  // check ascending
                        if (hand[i].value != starting_value + i) {
                            is_straight = false
                            break
                        }
                    }
                } else {
                    is_straight = false
                }

                // check flush
                let is_flush = false
                if (hand[1].color == hand[2].color && 
                    hand[1].color == hand[3].color && 
                    hand[1].color == hand[4].color && 
                    hand[4].value != 11) {
                    if (hand[0].color == hand[1].color || hand[0].color == 'm') {  // can use 1m in flush
                        is_flush = true
                    }
                }

                // return straight flush
                if (is_straight && is_flush) {  // straight flush
                    score = 100 + hand[4].value
                    switch (hand[0].color) {
                        case 'r':
                            score += .2
                            break
                        case 'y':
                            score += .1
                    }
                    return score

                } else if (is_straight) { // straight, scores from 1 to 12
                    score = hand[4].value
                    for (let i = 0; i < 5; i++) {
                        let card_score = 0
                        switch (hand[i].color) {
                            case 'm':
                                card_score = .3
                                break
                            case 'r':
                                card_score = .3
                                break
                            case 'y':
                                card_score = .1
                        }

                        score += card_score / Math.pow(10, i)

                        return score
                    }
                } else if (is_flush) { // flush
                    score = 20
                    switch (hand[0].color) {
                        case 'r':
                            score += 2
                            break
                        case 'y':
                            score += 1
                    }

                    for(let i = 0; i < 5; i++) {
                        score += (hand[i].value - 1) / Math.pow(10, i + 1)
                    }

                    return score
                }

                // full house
                if (hand[0].value == hand[1].value && hand[3].value == hand[4].value && 
                    + (hand[2].value == hand[1].value || hand[2].value == hand[3].value)) {
                    let three_value, two_value
                    if (hand[2] == hand[3]) {  // three biggest cards go together
                        three_value = this.handToScore(hand.slice(2))
                        two_value = this.handToScore(hand.slice(0, 2))
                    } else {
                        three_value = this.handToScore(hand.slice(0, 2))
                        two_value = this.handToScore(hand.slice(2))
                    }

                    score = 40 + three_value + two_value / 100

                    return score
                }
                
                return -1

            case 6:  // gang of 6
                // make sure cards are the same
                if (!(hand[0].value == hand[1].value &&
                    hand[0].value == hand[2].value &&
                    hand[0].value == hand[3].value &&
                    hand[0].value == hand[4].value &&
                    hand[0].value == hand[5].value)) {
                    return -1
                }
                
                score = 1200 + hand[0].value

                return score
                
            case 7:  // gang of 7
                // make sure cards are the same
                if (!(hand[0].value == hand[1].value && 
                    hand[0].value == hand[2].value &&
                    hand[0].value == hand[3].value &&
                    hand[0].value == hand[4].value &&
                    hand[0].value == hand[5].value &&
                    hand[0].value == hand[6].value)) {
                    return -1
                }

                return 1300

            default:  // cannot play more than 7 cards
                return -1
        }
    }
}

module.exports = Game;