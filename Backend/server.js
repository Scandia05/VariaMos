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
const connectedUsers = {};
const guests = {};
const workspaces = {}; // Estructura para almacenar usuarios por workspace

app.use(cors());
app.use(express.json());

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Registrar usuarios como invitados
  socket.on('signUpAsGuest', () => {
    const guestId = guestCounter++;
    guests[socket.id] = guestId;
    socket.emit('guestIdAssigned', { guestId });
    console.log(`Guest signed up: ${guestId} (Socket ID: ${socket.id})`); // Log cuando se registra un nuevo invitado
  });

  socket.on('registerUser', (userData) => {
    connectedUsers[userData.email] = socket.id;
    console.log(`${userData.email} registrado con socket ID ${socket.id}`);
  });

  // Gestionar invitaciones para colaborar
  // Gestionar invitaciones para colaborar
// Gestionar invitaciones para colaborar
socket.on('sendInvitation', (data) => {
  const invitedSocketId = connectedUsers[data.invitedUserEmail];
  if (invitedSocketId) {
    io.to(invitedSocketId).emit('invitationReceived', data);
    console.log(`${data.inviterName} ha invitado a ${data.invitedUserEmail} a colaborar en el workspace ${data.workspaceId}`);
    
    // Hacer que el anfitrión también se una al workspace
    socket.join(data.workspaceId); // El socket del anfitrión se une al workspace
    console.log(`Host joined workspace ${data.workspaceId} (Socket ID: ${socket.id})`);
  } else {
    console.log(`User ${data.invitedUserEmail} not found or not connected.`);
  }
});

  // Manejar el evento de unirse a un workspace
  socket.on('joinWorkspace', (data) => {
    const { clientId, workspaceId } = data;

    if (!workspaces[workspaceId]) {
        workspaces[workspaceId] = [];
    }
    workspaces[workspaceId].push(socket.id); // Agregar usuario al workspace

    socket.join(workspaceId); // Unir el socket al room correspondiente al workspace
    console.log(`Client ${clientId} joined workspace ${workspaceId} (Socket ID: ${socket.id})`);

    // Verificar si el anfitrión está unido al workspace
    const clientsInWorkspace = io.sockets.adapter.rooms.get(workspaceId);
    if (clientsInWorkspace) {
        clientsInWorkspace.forEach(socketId => {
            console.log(`User in workspace: ${socketId}`);
        });
    }

    // Notificar al cliente que ha unido un workspace
    io.to(socket.id).emit('workspaceJoined', { clientId, workspaceId });
});

  // Emitir eventos solo a los usuarios del mismo workspace
  socket.on('modelCreated', (data) => {
    console.log('Server received modelCreated from:', data.clientId, 'for workspace:', data.workspaceId);
    
    // Verificar si el anfitrión está en el workspace
    const clientsInWorkspace = io.sockets.adapter.rooms.get(data.workspaceId);
    if (clientsInWorkspace) {
        clientsInWorkspace.forEach(socketId => {
            console.log(`modelCreated is being sent to socket ID: ${socketId}`);
        });
    }
    io.to(data.workspaceId).emit('modelCreated', data);  // Retransmitir a todos en el workspace
  });
  
  // Manejar la eliminación de un modelo
  socket.on('modelDeleted', (data) => {
    console.log(`Server received modelDeleted:`, data);
    io.to(data.workspaceId).emit('modelDeleted', data);  // Retransmitir a todos en el workspace
  });
  
  // Manejar el renombramiento de un modelo
  socket.on('modelRenamed', (data) => {
    console.log(`Server received modelRenamed:`, data);
    io.to(data.workspaceId).emit('modelRenamed', data);  // Retransmitir a todos en el workspace
  });
  
  // Manejar la configuración de un modelo
  socket.on('modelConfigured', (data) => {
    console.log(`Server received modelConfigured:`, data);
    io.to(data.workspaceId).emit('modelConfigured', data);  // Retransmitir a todos en el workspace
  });
  
  socket.on('cellMoved', (data) => {
    console.log('Server received cellMoved:', data);
    io.to(data.workspaceId).emit('cellMoved', data); // Emitir solo al workspace correspondiente
  });

  socket.on('cellAdded', (data) => {
    console.log('Server received cellAdded:', data);
    io.to(data.workspaceId).emit('cellAdded', data);
    console.log(`Emitting cellAdded to all clients in workspace ${data.workspaceId}`);

  });

  socket.on('cellRemoved', (data) => {
    console.log('Server received cellRemoved:', data);
    io.to(data.workspaceId).emit('cellRemoved', data);
  });

  socket.on('cellConnected', (data) => {
    console.log('Server received cellConnected:', data);
    io.to(data.workspaceId).emit('cellConnected', data);
  });

  socket.on('labelChanged', (data) => {
    console.log('Server received labelChanged:', data);
    io.to(data.workspaceId).emit('labelChanged', data);
  });

  socket.on('cellResized', (data) => {
    console.log('Server received cellResized:', data);
    io.to(data.workspaceId).emit('cellResized', data);
  });

  socket.on('propertiesChanged', (data) => {
    console.log('Server received propertiesChanged:', data);
    io.to(data.workspaceId).emit('propertiesChanged', data);
  });

  socket.on('cursorMoved', (data) => {
    io.to(data.workspaceId).emit('cursorMoved', data);
  });

  socket.on('edgeStyleChanged', (data) => {
    io.to(data.workspaceId).emit('edgeStyleChanged', data);
  });

  socket.on('edgeLabelChanged', (data) => {
    io.to(data.workspaceId).emit('edgeLabelChanged', data);
  });

  // Al desconectarse, eliminar el usuario del workspace correspondiente
  socket.on('disconnect', () => {
    // Eliminar el usuario del mapa de usuarios conectados cuando se desconecta
    for (const email in connectedUsers) {
      if (connectedUsers[email] === socket.id) {
        delete connectedUsers[email];
        break;
      }
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
