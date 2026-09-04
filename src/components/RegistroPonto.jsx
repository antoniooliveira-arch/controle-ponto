import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export default function RegistroPonto() {
  const [funcionarios, setFuncionarios] = useState([])
  const [localTrabalho, setLocalTrabalho] = useState(null)
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [precision, setPrecision] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Buscar funcionários e locais
  useEffect(() => {
    async function carregarDados() {
      try {
        const { data: funcs } = await supabase
          .from('funcionarios')
          .select('*')
        const { data: locais } = await supabase
          .from('locais_trabalho')
          .select('*')
        setFuncionarios(funcs || [])
        setLocalTrabalho(locais?.[0] || null)
      } catch (e) {
        setError('Erro ao carregar dados: ' + e.message)
      }
    }
    carregarDados()
  }, [])

  // Simular geolocalização (em produção usar navigator.geolocation)
  useEffect(() => {
    // Valores simulados - remover quando integrar GPS real
    const simLat = -12.0570
    const simLng = -44.2588
    const simPrecision = 15
    setLatitude(simLat)
    setLongitude(simLng)
    setPrecision(simPrecision)
  }, [])

  const handleRegistrar = async () => {
    if (!funcionarios.length || !localTrabalho) {
      setError('Selecione um funcionário e local de trabalho')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: user } = await supabase.auth.getUser()
      const func = funcionarios.find(f => f.nome === document.getElementById('funcionario-select').value)

      const registro = {
        funcionario_id: func.id,
        local_trabalho_id: localTrabalho.id,
        latitude,
        longitude,
        precision,
        tipo: 'entrada',
        data_hora: new Date().toISOString()
      }

      const { error } = await supabase
        .from('registros_ponto')
        .insert([registro])
      if (error) throw error

      setSuccess('Ponto registrado com sucesso!')
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Erro ao registrar ponto: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (funcionarios.length === 0 && error) {
    return <div style={{ padding: '2rem' }}>Erro: {error}</div>
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h2>Registrar Ponto</h2>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      {success && <div style={{ color: 'green', marginBottom: '1rem' }}>Ponto registrado!</div>}

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Funcionário:</label>
        <select
          id="funcionario-select"
          style={{
            width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db'
          }}
          defaultValue=""
        >
          <option value="">Selecione um funcionário</option>
          {funcionarios.map((func) => (
            <option key={func.id} value={func.nome}>
              {func.nome} - {func.cargo}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Local de Trabalho:</label>
        {localTrabalho ? (
          <div>
            <strong>{localTrabalho.nome}</strong>
            <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>
              Lat: {localTrab.latitude.toFixed(4)} , Lng: {localTrab.longitude.toFixed(4)}
            </p>
            <p style={{ fontSize: '0.75rem', opacity: 0.8 }}>
              Raio: {localTrab.radiusMeters} metros
            </p>
          </div>
        ) : (
          <p>Nenhum local cadastrado</p>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Posição GPS:</label>
        <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>
          Lat: {latitude ? latitude.toFixed(4) : '---'} , Lng: {longitude ? longitude.toFixed(4) : '---'}
        </p>
        <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>
          Precisão: {precision ? precision + ' m' : '---'}
        </p>
      </div>

      <button
        onClick={handleRegistrar}
        disabled={loading || !latitude || !longitude || !funcionarios.length || !localTrabalho}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: loading ? '#6b7280' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '1rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginTop: '1rem'
        }}
      >
        {loading ? 'Registrando...' : 'Registrar Ponto'}
      </button>

      {loading && <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.8 }}>Obtendo localização...</p>}
    </div>
  )
}