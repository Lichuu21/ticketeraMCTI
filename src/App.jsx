import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TableroKanban from './components/TableroKanban'
import Login from './pages/Login'
import Registro from './pages/Registro'
import RutaProtegida from './components/RutaProtegida'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />

          {/* Rutas Protegidas */}
          <Route element={<RutaProtegida />}>
            <Route path="/" element={<TableroKanban />} />
          </Route>

          {/* Rutas no encontradas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App