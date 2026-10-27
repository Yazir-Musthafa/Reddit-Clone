import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { BrowserRouter } from 'react-router';
import { AuthProvider } from './AuthContext.jsx';
import { DialogProvider } from './context/DialogContext.jsx';

createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <AuthProvider>
            <DialogProvider>
                <App />
            </DialogProvider>
        </AuthProvider>
    </BrowserRouter>
);
