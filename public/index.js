const socket = io('http://localhost:3000')

const gameContainer = document.getElementById('game-container')

// send connection message
socket.emit('index_connection')
console.log('connected using index conneciton')

socket.on('game_created', gameName => {
    const gameElement = document.createElement('div')
    gameElement.id = gameName
    gameElement.class = "game"
    const gameLink = document.createElement('a')
    gameLink.href = `/${gameName}`
    gameLink.innerText = gameName
    gameElement.append(gameLink)
    gameContainer.append(gameElement)
})

socket.on('game_removed', gameName => {
    const gameElement = document.getElementById(gameName)
    gameContainer.removeChild(gameElement)
})
