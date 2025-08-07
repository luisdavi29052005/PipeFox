
import { ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CreateWorkflow from './pages/CreateWorkflow'
import WorkflowEditor from './pages/WorkflowEditor'
import ProtectedRoute from './routes/ProtectedRoute'

export default function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/login" element={
          <div className="min-h-screen flex items-center justify-center p-4">
            <Login />
          </div>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/workflow/create" element={
          <ProtectedRoute>
            <CreateWorkflow />
          </ProtectedRoute>
        } />
        <Route path="/workflow/:id" element={
          <ProtectedRoute>
            <WorkflowEditor />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}
