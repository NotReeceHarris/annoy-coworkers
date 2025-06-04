const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const readline = require('node:readline');

// Store connected users with additional info (socket ID as key)
const connectedUsers = new Map();

// State object for toggled features and one-time actions
const toggled = {
    w: false,   // Wiggle mouse
    r: false,   // Randomly click
    c: false,   // Randomly capitalise
    s: false,   // Subtle mode
    p: false,   // Piss off mode
    k: false,   // Keyboard sharing mode
    // One-time actions (not toggles)
    l: false,   // Rickroll
    n: false,   // Notification
    z: false    // Sleep
};

// ASCII faces for terminal display based on active toggles
const faces = {
    rage: 'ლ(ಠ益ಠ)ლ',
    pissed: '┌∩┐(◣_◢)┌∩┐',
    angry: '(⋟﹏⋞)',
    sleeping: '(-.-)Zzz...'
};

// Create HTTP server and Socket.IO instance
const server = createServer();
const io = new Server(server);

// Set up readline interface for terminal input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Handle keypress events for toggling features or sending actions
process.stdin.on('keypress', (char, key) => {
    if (toggled.k) {
        // Handle escape key to toggle keyboard sharing mode
        if (key && key.name === 'escape') {
            toggled.k = !toggled.k;
            updateTerminal();
            return;
        }
        // Broadcast keypress to connected clients
        io.emit('keypress', char);
        return;
    }

    // Map keypresses to actions or toggles
    const actions = {
        'w': () => toggled.w = !toggled.w,
        'r': () => toggled.r = !toggled.r,
        'c': () => toggled.c = !toggled.c,
        's': () => toggled.s = !toggled.s,
        'p': () => toggled.p = !toggled.p,
        'l': () => toggled.l = true,
        'z': () => toggled.z = true,
        'n': () => toggled.n = true,
        'k': () => toggled.k = !toggled.k
    };

    // Execute action if key exists in map, then update terminal
    const action = actions[char.toLowerCase()];
    if (action) {
        action();
        updateTerminal();
    }
});

// Function to clear and update terminal display
function updateTerminal() {
    // Clear terminal (works on most Unix-based systems)
    process.stdout.write('\x1Bc');

    // Display keyboard sharing status if active
    if (toggled.k) {
        console.log('Keyboard sharing is ON. Press ESC to disable.');
        return;
    }

    // Count active toggles (exclude one-time actions and keyboard)
    const activeToggles = Object.entries(toggled)
        .filter(([key, value]) => value && !['rickroll', 'notification', 'sleep', 'keyboard'].includes(key))
        .length;

    // Determine face based on number of active toggles
    const currentFace = activeToggles === 1 ? faces.angry :
        activeToggles === 2 ? faces.pissed :
            activeToggles >= 3 ? faces.rage :
                faces.sleeping;

    // Display header with face and connected user count
    console.log(` ${currentFace} | ${connectedUsers.size} coworker connected.`);
    console.log(`-${'-'.repeat(currentFace.length)}---${'-'.repeat(connectedUsers.size.toString().length)}--------------------`);

    // Display toggle states with color coding (green for ON, red for OFF)
    const toggleDisplay = (label, key) =>
        console.log(`${toggled[key] ? '\x1b[32mON' : '\x1b[31mOFF'}\x1b[0m\t: ${label} [ ${key.toUpperCase()} ]`);
    
    toggleDisplay('Wiggle mouse', 'w');
    toggleDisplay('Randomly click', 'r');
    toggleDisplay('Randomly capitalise', 'c');
    toggleDisplay('Subtle mode', 's');
    toggleDisplay('Piss off mode', 'p');
    toggleDisplay('Toggle share keyboard', 'k');

    // Display separator and one-time action options
    console.log(`-${'-'.repeat(currentFace.length)}---${'-'.repeat(connectedUsers.size.toString().length)}--------------------`);
    console.log('Rickroll [l]');
    console.log('Sleep [z]');
    console.log('Notification [n]');
    console.log('Exit [ Ctrl + C ]');
    console.log(`-${'-'.repeat(currentFace.length)}---${'-'.repeat(connectedUsers.size.toString().length)}--------------------`);
    console.log('Press desired key to toggle features');
}

// Handle new socket connections
io.on('connection', (socket) => {
    // Store user info from handshake query
    const userInfo = {
        username: socket.handshake.query.username || 'Anonymous',
        connectedAt: new Date().toLocaleString(),
        ip: socket.handshake.address
    };
    connectedUsers.set(socket.id, userInfo);

    // Update terminal on connection
    updateTerminal();

    // Handle disconnection and update terminal
    socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        updateTerminal();
    });
});

// Periodic actions for connected clients
let count = 0;
setInterval(() => {
    // Skip if no users are connected
    if (connectedUsers.size === 0) return;

    // Handle one-time actions and reset their flags
    const oneTimeActions = ['l', 'z', 'n'];
    oneTimeActions.forEach(action => {
        if (toggled[action]) {
            io.emit('message', action);
            toggled[action] = false;
        }
    });

    // Apply subtle mode delay if active and not in pissoff mode
    if (toggled.s && !toggled.p) {
        count++;
        if (count <= 10) return;
        count = 0;
    }

    // Define recurring actions with probability
    const recurringActions = [
        { key: 'w', chance: 0.4 },
        { key: 'r', chance: 0.2 },
        { key: 'c', chance: 0.2 }
    ];

    // Execute recurring actions based on toggle and probability
    recurringActions.forEach(({ key, chance }) => {
        if (toggled[key]) {
            const shouldAct = toggled.p || Math.random() < chance;
            if (shouldAct) {
                io.emit('message', key);
            }
        }
    });
}, 1000);

// Start server and update terminal on initialization
server.listen(3000, () => {
    console.log('Server running on port 3000');
    updateTerminal();
});

// Error handling for server
server.on('error', (err) => {
    console.error('Server error:', err.message);
    process.exit(1);
});