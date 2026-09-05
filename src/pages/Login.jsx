import { useState } from 'react'
import { signInTraditional, getUserRole, isAdmin } from '../services/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    setShowSuccess(false)

    try {
      const { data, error } = await signInTraditional(email, password)
      
      if (error) {
        setError('Email ou senha inválidos')
        setLoading(false)
        return
      }

      // Verificar role após login bem-sucedido
      const role = await getUserRole()
      
      if (role === 'admin') {
        setShowSuccess(true)
        // Pequeno delay para mostrar sucesso antes de navegar
        setTimeout(() => {}, 100)
      } else {
        setError('Acesso negado: perfil de usuário comum')
        setLoading(false)
      }
    } catch (err) {
      setError('Erro ao fazer login')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem', background: '#f8f9fa', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Login Administrativo</h2>
      
      {error && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {showSuccess && (
        <div style={{ background: '#d1e7dd', color: '#155724', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center', marginTop: '1rem' }}>
          <strong>Login bem-sucedido!</strong> Redirecionando...
        </div>
      )}

      <form style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: '500' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%', padding: '0.5rem', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '1rem'
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: '500' }}>Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%', padding: '0.5rem', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '1rem'
            }}
            required
          />
        </div>

        <button
          type="submit"
          style={{
            width: '100%', padding: '0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer'
          }}
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

<div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: '#6c757d' }}>
        <p>Credenciais de acesso:</p>
        <div style={{ fontFamily: 'monospace', background: '#e9ecef', padding: '0.2rem 0.4rem', borderRadius: '3px', marginTop: '0.5rem', textAlign: 'center' }}>
          <strong>admin</strong> / <strong>admin</strong>
        </div>
      </div>
    </div>
  )
}