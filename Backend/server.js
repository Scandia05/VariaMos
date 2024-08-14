const express = require('express');
const http = require('http');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

let guestCounter = 1;
const guests = {};

app.use(cors());
app.use(express.json());

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  socket.on('signUpAsGuest', () => {
    const guestId = guestCounter++;
    guests[socket.id] = guestId;
    socket.emit('guestIdAssigned', { guestId });
});

  socket.on('modelCreated', (data) => {
    console.log(`Model created by ${data.clientId}`);
    socket.broadcast.emit('modelCreated', data);
  });

  socket.on('modelRenamed', (data) => {
    console.log(`Model renamed by ${data.clientId} to ${data.newName}`);
    socket.broadcast.emit('modelRenamed', data);
  });

  socket.on('modelDeleted', (data) => {
    console.log(`Model deleted by ${data.clientId}`);
    socket.broadcast.emit('modelDeleted', data);
  });

  socket.on('modelConfigured', (data) => {
    console.log(`Model configured by ${data.clientId}`);
    socket.broadcast.emit('modelConfigured', data);
  });

  socket.on('cellMoved', (data) => {
    console.log('Server received cellMoved:', data);
    socket.broadcast.emit('cellMoved', data);
  });

  socket.on('cellAdded', (data) => {
    console.log('Server received cellAdded:', data);
    socket.broadcast.emit('cellAdded', data);
  });

  socket.on('cellRemoved', (data) => {
    console.log('Server received cellRemoved:', data);
    socket.broadcast.emit('cellRemoved', data);
  });

  socket.on('cellConnected', (data) => {
    console.log('Server received cellConnected:', data);
    socket.broadcast.emit('cellConnected', data);
  });

  socket.on('labelChanged', (data) => {
    console.log('Server received labelChanged:', data);
    socket.broadcast.emit('labelChanged', data);
  });

  socket.on('cellResized', (data) => {
    console.log('Server received cellResized:', data);
    socket.broadcast.emit('cellResized', data);
  });

  socket.on('propertiesChanged', (data) => {
    console.log('propertiesChanged received:', data);
    socket.broadcast.emit('propertiesChanged', data);
  });

  socket.on('cursorMoved', (data) => {
    socket.broadcast.emit('cursorMoved', data);
});

socket.on('edgeStyleChanged', (data) => {
  socket.broadcast.emit('edgeStyleChanged', data);
});

socket.on('edgeLabelChanged', (data) => {
  socket.broadcast.emit('edgeLabelChanged', data);
});

socket.on('cellLabelChanged', (data) => {
  console.log('cellLabelChanged event received:', data);
  // Retransmitir el cambio de nombre a todos los demás usuarios conectados
  socket.broadcast.emit('cellLabelChanged', data);
});

socket.on('disconnect', () => {
  delete guests[socket.id];
});

});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
