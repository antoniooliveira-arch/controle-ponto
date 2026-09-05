import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { isAdmin, getUserRole, signInTraditional } from '../services/supabase'

export default function Header() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function carregarUsuario() {
      // Verificar sessão existente
      const { data: { user} } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        // Já está logado, verificar role
        const userRole = await getUserRole()
        setRole(userRole)
      } else {
        setRole(null)
      }
      setIsLoading(false)
    }
    carregarUsuario()
  }, [])

  const handleLoginTraditional = async (email, password) => {
    setIsLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      // Se falhar com supabase auth, tentar com nosso sistema customizado
      const { data: customData, error: customError } = await signInTraditional(email, password)
      
      if (customError) {
        setIsLoading(false)
        return { success: false, error: customError.message }
      }
      
      // Login customizado funcionou - verificar role
      const role = await getUserRole()
      setUser(customData.user)
      setRole(role)
      setIsLoading(false)
      return { success: true, user: customData.user, role }
    }

    // Login Supabase padrão funcionou
    const role = await getUserRole()
    setUser(data.user)
    setRole(role)
    setIsLoading(false)
    return { success: true, user: data.user, role }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setRole(null)
  }

  if (isLoading) {
    return (
      <header style={{ padding: '1rem', background: ' #18181b', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Controle de Ponto</h1>
          <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>Carregando...</p>
        </div>
      </header>
    )
  }

  return (
    <header style={{ padding: '1rem', background: ' #18181b', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Controle de Ponto</h1>
        
        {user ? (
          <>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
              {user.email ? `Bem-vindo, ${user.email}` : 'Usuário logado'}
            </div>
            {role === 'admin' && (
              <span style={{ marginLeft: '1rem', background: '#ef4444', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                Admin
              </span>
            )}
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                background: '#dc2626',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Sair
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => alert('Use login tradicional: admin / admin')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                background: '#3b82f6',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Login Tradicional
            </button>
            <button
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                background: 'transparent',
                color: '#d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                textDecoration: 'underline'
              }}
            >
              ou Login por Email
            </button>
          </>
        )}
      </div>
    </header>
  )
}