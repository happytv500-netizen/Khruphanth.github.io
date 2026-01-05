import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// --- Import CSS ของ Bootstrap และ Icons ที่นี่ ---
import 'bootstrap/dist/css/bootstrap.min.css'     // CSS หลักของ Bootstrap
import 'bootstrap/dist/js/bootstrap.bundle.min.js' // JavaScript (สำหรับ Modal, Dropdown, Navbar)
import 'bootstrap-icons/font/bootstrap-icons.css'  // Icon library

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)