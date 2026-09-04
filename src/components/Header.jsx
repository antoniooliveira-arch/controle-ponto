import { useState } from 'react'
import { useSupabase } from '../services/supabase'

export default function Header() {
  const [user, setUser] = useState(null)
  
  // Verificar sessão ao montar
  // Nota: Em um app real, isso seria feito via useEffect ou auth state
  
  return (
    <header style={{ padding: '1rem', background: ' #18181b', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Controle de Ponto</h1>
        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
          {user ? `Bem-vindo, ${user.nome}` : 'Não logado'}
        </div>
        <button
          onClick={() => alert('Login simulado - substituir por auth real')}
          style={{
            padding: '0.5rem 1rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Login
        </button>
      </div>
    </header>
  )
}