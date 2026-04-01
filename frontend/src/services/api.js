import axios from 'axios';

const api = axios.create({
    baseURL: '/api'
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // Emite un event global interceptat in AuthContext pentru delogare automata
            window.dispatchEvent(new Event('auth-unauthorized'));
        }
        return Promise.reject(error);
    }
);

export default api;
