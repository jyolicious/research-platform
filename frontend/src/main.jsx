import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId="GOOGLE_CLIENT_ID">
    <AuthProvider>
      <App />
    </AuthProvider>
  </GoogleOAuthProvider>
)