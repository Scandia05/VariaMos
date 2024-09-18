import io from 'socket.io-client';

// Solo necesitas configurar la conexión una vez
const socket = io('http://192.168.208.148:4000');

// Exportar la misma instancia para ser usada en cualquier parte de la aplicación
export default socket;
