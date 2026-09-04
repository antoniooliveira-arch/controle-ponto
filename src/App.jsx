import { useState, useEffect } from 'react'
import Header from './components/Header'
import RegistroPonto from './components/RegistroPonto'
import Mapa from './components/Mapa'

export default function App() {
  const [pagina, setPagina] = useState('ponto')

  useEffect(() => {
    // Verificar autenticação ao carregar
    // Em produção, verificar sessão here
  }, [])

  const pages = {
    ponto: (
      <div>
        <Header />
        <RegistroPonto />
      </div>
    ),
    mapa: (
      <div>
        <Header />
        <Mapa />
      </div>
    ),
    funcionarios: (
      <div>
        <Header />
        <p>Página de Funcionários - em desenvolvimento</p>
      </div>
    ),
    locais: (
      <div>
        <Header />
        <p>Página de Locais - em desenvolvimento</p>
      </div>
    ),
    dashboard: (
      <div>
        <Header />
        <p>Painel Administrativo - em desenvolvimento</p>
      </div>
    )
  }

  return (
    <div>
      <nav style={{ padding: '1rem', background: '#18181b', color: 'white' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <button
            onClick={() => setPagina('ponto')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: pagina === 'ponto' ? '#3b82f6' : 'transparent',
              color: pagina === 'ponto' ? 'white' : '#d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: pagina === 'ponto' ? 500 : 400
            }}
          >
            Registrar Ponto
          </button>
          <button
            onClick={() => setPagina('mapa')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: pagina === 'mapa' ? '#3b82f6' : 'transparent',
              color: pagina === 'mapa' ? 'white' : '#d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: pagina === 'mapa' ? 500 : 400
            }}
          >
            Mapas
          </button>
          <button
            onClick={() => setPagina('funcionarios')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: pagina === 'funcionarios' ? '#3b82f6' : 'transparent',
              color: pagina === 'funcionarios' ? 'white' : '#d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: pagina === 'funcionarios' ? 500 : 400
            }}
          >
            Funcionários
          </button>
          <button
            onClick={() => setPagina('locais')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: pagina === 'locais' ? '#3b82f6' : 'transparent',
              color: pagina === 'locais' ? 'white' : '#d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: pagina === 'locais' ? 500 : 400
            }}
          >
            Locais
          </button>
          <button
            onClick={() => setPagina('dashboard')}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: pagina === 'dashboard' ? '#3b82f6' : 'transparent',
              color: pagina === 'dashboard' ? 'white' : '#d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: pagina === 'dashboard' ? 500 : 400
            }}
          >
            Dashboard
          </button>
        </div>
      </nav>

      <main style={{ padding: '2rem', minHeight: '400px' }}>
        {pages[pagina]}
      </main>
    </div>
  )
}