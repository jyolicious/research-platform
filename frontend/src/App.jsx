import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Papers from './pages/Papers'
import Editor from './pages/Editor'
import ProtectedRoute from './components/ProtectedRoute'
import PaperDetail from './pages/PaperDetail'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/papers" element={
          <ProtectedRoute><Papers /></ProtectedRoute>
        } />
        <Route path="/editor" element={
          <ProtectedRoute><Editor /></ProtectedRoute>
        } />
        <Route path="/editor/:id" element={
          <ProtectedRoute><Editor /></ProtectedRoute>
        } />
        <Route path="/papers/:id" element={<ProtectedRoute><PaperDetail /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}