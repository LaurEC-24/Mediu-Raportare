import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on load
        const savedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (savedUser && token) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);

        // Ascultator pentru 401 Expirat Token
        const handleUnauthorized = () => {
            logout();
        };
        window.addEventListener('auth-unauthorized', handleUnauthorized);

        // Logica Auto-Logout dupã 1 orã de inactivitate (3600 secunde)
        let idleTimeout;
        const resetIdleTimer = () => {
            clearTimeout(idleTimeout);
            idleTimeout = setTimeout(() => {
                const isTokenPresent = localStorage.getItem('token');
                if (isTokenPresent) { // Daca este online inca
                    alert('Sesiunea ta a expirat din cauza unei inactivități mai mari de o oră. Te rugăm să te conectezi din nou pentru securitate.');
                    logout();
                }
            }, 3600000); // 1 oră în milisecunde
        };

        // Resetăm timerul la orice interacțiune fizică utilă
        const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
        events.forEach(e => window.addEventListener(e, resetIdleTimer));
        
        resetIdleTimer(); // Pornim timerul la inițializare

        return () => {
             window.removeEventListener('auth-unauthorized', handleUnauthorized);
             events.forEach(e => window.removeEventListener(e, resetIdleTimer));
             clearTimeout(idleTimeout);
        };
    }, []);

    const login = async (username, password) => {
        try {
            const response = await api.post('/login', { username, password });
            const { user, token } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Login failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/login'; // Redirect fortat spre curatare totala de rute
    };

    if (loading) return <div>Loading...</div>;

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};
