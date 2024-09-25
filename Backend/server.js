const express = require('express');
const http = require('http');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const socketIo = require('socket.io');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const pool = new Pool({
  user: 'adminpg',
  host: 'app.variamos.com',
  database: 'VariamosDB',
  password: 'a=m=8hos.G!-s<*M1G',
  port: 5433,
});

const queryDB = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('Error ejecutando consulta:', err);
    throw err;
  }
};


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

  socket.on('registerUser', async (userData) => {
    const query = `INSERT INTO users(email, socket_id)
                   VALUES($1, $2)
                   ON CONFLICT (email) DO UPDATE SET socket_id = EXCLUDED.socket_id`;
    const values = [userData.email, socket.id];
  
    try {
      await queryDB(query, values);
      connectedUsers[userData.email] = socket.id;
      console.log(`${userData.email} registrado con socket ID ${socket.id}`);
    } catch (err) {
      console.error('Error registrando el usuario:', err);
    }
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
  socket.on('joinWorkspace', async (data) => {
    const { clientId, workspaceId } = data;
  
    // Unir el socket al room correspondiente al workspace
    socket.join(workspaceId);
    console.log(`Client ${clientId} joined workspace ${workspaceId} (Socket ID: ${socket.id})`);
  
    // Guardar la relación entre el cliente y el workspace en la base de datos
    const query = `INSERT INTO workspace_users (workspace_id, client_id, socket_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`;
    const values = [workspaceId, clientId, socket.id];
  
    try { 
      await queryDB(query, values);
      console.log(`Client ${clientId} added to workspace ${workspaceId} in the database`);
    } catch (err) {
      console.error('Error saving workspace join in the database:', err);
    }
  
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
  socket.on('modelCreated', async (data) => {
    console.log('Server received modelCreated:', data);
  
    const query = `INSERT INTO models(id, name, type, data, workspace_id)
                   VALUES($1, $2, $3, $4, $5)`;
    const values = [data.model.id, data.model.name, data.model.type, JSON.stringify(data.model), data.workspaceId];
  
    try {
      await queryDB(query, values);
      console.log(`Modelo guardado en la base de datos: ${data.model.name}`);
    } catch (err) {
      console.error('Error guardando el modelo:', err);
    }
  
    io.to(data.workspaceId).emit('modelCreated', data);
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

  socket.on('cellAdded', async (data) => {
    console.log('Server received cellAdded:', data);
  
    const query = `INSERT INTO cells(id, model_id, data)
                   VALUES($1, $2, $3)`;
    const values = [data.cell.id, data.modelId, JSON.stringify(data.cell)];
  
    try {
      await queryDB(query, values);
      console.log(`Celda guardada en la base de datos: ${data.cell.id}`);
    } catch (err) {
      console.error('Error guardando la celda:', err);
    }
  
    io.to(data.workspaceId).emit('cellAdded', data);
  });
  
  socket.on('cellRemoved', (data) => {
    console.log('Server received cellRemoved:', data);
    io.to(data.workspaceId).emit('cellRemoved', data);
  });

  socket.on('cellConnected', async (data) => {
    console.log('Server received cellConnected:', data);
  
    const query = `INSERT INTO connections(id, source_id, target_id, model_id, workspace_id)
                   VALUES($1, $2, $3, $4, $5)`;
    const values = [uuidv4(), data.sourceId, data.targetId, data.modelId, data.workspaceId];
  
    try {
      await queryDB(query, values);
      console.log(`Conexión guardada en la base de datos: ${data.sourceId} -> ${data.targetId}`);
    } catch (err) {
      console.error('Error guardando la conexión:', err);
    }
  
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
