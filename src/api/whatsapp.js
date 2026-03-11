// frontend/src/api/whatsapp.js
import api from './axios';

const whatsappApi = {
  getStatus:  ()  => api.get('/whatsapp/status'),
  connect:    ()  => api.post('/whatsapp/connect'),
  disconnect: ()  => api.post('/whatsapp/disconnect'),
};

export default whatsappApi;