import axios from 'axios';

// Stateless authentication: no session cookie. The logged-in user's database
// id is sent as a request header so protected API routes can identify them.
const api=axios.create({baseURL:'/api'});
api.interceptors.request.use(config=>{
  try{
    const raw=localStorage.getItem('user');
    if(raw){
      const user=JSON.parse(raw);
      if(user?.id)config.headers['X-User-Id']=String(user.id);
    }
  }catch{}
  return config;
});

export default api;
