const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const readline = require('node:readline');

// Store connected users with additional info
const connectedUsers = new Map();
const server = createServer();
const io = new Server(server);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

process.stdin.on('keypress', (char, key) => {

    if (toggled.keyboard) {

        // escape key handling
        if (key && key.name === 'escape') {
            toggled.keyboard = !toggled.keyboard;
            updateTerminal();
            return
        }

        io.emit('keypress', char);
        return;

    }
    
    switch (char.toLowerCase()) {
        case 'w':
            toggled.wiggle = !toggled.wiggle;
            break;
        case 'r':
            toggled.click = !toggled.click;
            break;
        case 'c':
            toggled.cap = !toggled.cap;
            break;
        case 's':
            toggled.subtle = !toggled.subtle;
            break;
        case 'p':
            toggled.pissoff = !toggled.pissoff;
        case 'l':
            toggled.rickroll = true;
            break;
        case 'z':
            toggled.sleep = true;
            break;
        case 'n':
            toggled.notification = true;
            break;
        case 'k':
            toggled.keyboard = !toggled.keyboard;
            updateTerminal();
            break;
        default:
            break;
    }

    updateTerminal()
});

const toggled = {
    wiggle: false,
    click: false,
    cap: false,
    subtle: false,
    pissoff: false,
    keyboard: false,

    // Actions that are not toggled
    rickroll: false,
    notification: false,
    sleep: false
}

const faces = {
    rage: 'ლ(ಠ益ಠ)ლ',
    pissed: '┌∩┐(◣_◢)┌∩┐',
    angry: '(⋟﹏⋞)',
    sleeping: '(-.-)Zzz...'
}

// Function to clear terminal and display updated user log
function updateTerminal() {
    // Clear terminal (works in most terminals, e.g., Unix-based systems)
    process.stdout.write('\x1Bc');

    if (toggled.keyboard) {
        console.log('Keyboard sharing is ON. Press ESC to disable.');
        return;
    }

    let currentFace = faces.sleeping

    switch (Object.values(toggled).filter(v => v).length) {
        case 1:
            currentFace = faces.angry;
            break;
        case 2:
            currentFace = faces.pissed;
            break;
        case 3:
            currentFace = faces.rage;
            break;
        default:
            currentFace = faces.sleeping;
            break;
    }
    
    console.log(` ${currentFace} | ${connectedUsers.size} coworker connected.`);
    console.log(`-${'-'.repeat(currentFace.length)}---${'-'.repeat(connectedUsers.size.toString().length)}--------------------`);
    console.log(`${toggled.wiggle ? '\x1b[32mON' : '\x1b[31mOFF'}\x1b[0m\t: Wiggle mouse [ W ]`)
    console.log(`${toggled.click ? '\x1b[32mON' : '\x1b[31mOFF'}\x1b[0m\t: Randomly click [ R ]`)
    console.log(`${toggled.cap ? '\x1b[32mON' : '\x1b[31mOFF'}\x1b[0m\t: Randomly capitalise [ C ]`)
    console.log(`${toggled.subtle && !toggled.pissoff ? '\x1b[32mON' : '\x1b[31mOFF'}\x1b[0m\t: Subtle mode [ S ]`)
    console.log(`${toggled.pissoff ? '\x1b[32mON' : '\x1b[31mOFF'}\x1b[0m\t: Piss off mode [ P ]`)
    console.log(`${toggled.keyboard ? '\x1b[32mON' : '\x1b[31mOFF'}\x1b[0m\t: Toggle share keyboard [ K ]`)
    console.log(`-${'-'.repeat(currentFace.length)}---${'-'.repeat(connectedUsers.size.toString().length)}--------------------`);
    console.log('Rickroll [l]');
    console.log('Sleep [z]');
    console.log('Notification [n]');
    console.log('Exit [ Ctrl + C ]');
    console.log(`-${'-'.repeat(currentFace.length)}---${'-'.repeat(connectedUsers.size.toString().length)}--------------------`);
    console.log('Press desired key to toggle features');

}

io.on('connection', (socket) => {
    // Add new user to the map with additional info
    const userInfo = {
        username: socket.handshake.query.username || 'Anonymous', // Client can pass username via query
        connectedAt: new Date().toLocaleString(),
        ip: socket.handshake.address
    };
    
    connectedUsers.set(socket.id, userInfo);
    
    // Log connection and update terminal
    updateTerminal();
    
    // Handle disconnection
    socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        updateTerminal();
    });
});

// Clock
let count = 0;
setInterval(() => {
    if (connectedUsers.size > 0) {

        // If rickroll is toggled, send a rickroll message
        if (toggled.rickroll) {
            toggled.rickroll = false; // Reset after sending
            io.emit('message', 'rickroll');
        }

        if (toggled.sleep) {
            toggled.sleep = false; // Reset after sending
            io.emit('message', 'sleep');
        }

        if (toggled.notification) {
            toggled.notification = false; // Reset after sending
            io.emit('message', 'notification');
        }

        // Slow down the messages if subtle mode is toggled
        if (toggled.subtle && !toggled.pissoff) {
            count++;
            if (count <= 10) return
            count = 0;
        }
        
        if (toggled.wiggle) {
            const odd = toggled.pissoff ? true : Math.random() < 0.4;
            if (odd) {
                io.emit('message', 'wiggle');
            }
        }

        if (toggled.click) {
            const odd = toggled.pissoff ? true : Math.random() < 0.2;
            if (odd) {
                io.emit('message', 'click');
            }
        }

        if (toggled.cap) {
            const odd = toggled.pissoff ? true : Math.random() < 0.2;
            if (odd) {
                io.emit('message', 'cap');
            }
        }

    }
}, 1000);

server.listen(3000, () => {
    updateTerminal()
});