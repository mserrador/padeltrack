import axios from 'axios';

// Configura aquí la IP y puerto de tu servidor local/SSH
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;