import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export default function Dashboard() {
  const [registros, setRegistros] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [locais, setLocais] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregarDados() {
      try {
        const { data: registrosData } = await supabase
          .from('registros_ponto')
          .select(`
            *,
            funcionarios (nome, cargo)
          `)
        const { data: funcs } = await supabase.from('funcionarios').select('*')
        const { data: locaisData } = await supabase.from('locais_trabalho').select('*')
        setRegistros(registrosData || [])
        setFuncionarios(funcs || [])
        setLocais(locaisData || [])
        setLoading(false)
      } catch (e) {
        setError('Erro ao carregar dados: ' + e.message)
        setLoading(false)
      }
    }
    carregarDados()
  }, [])

  if (error) {
    return <div style={{ padding: '2rem', color: 'red' }}>Erro: {error}</div>
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Carregando dados...</div>
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <h2>Painel Administrativo</h2>
      
      <div style={{ marginBottom: '2rem', background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px' }}>
        <h3>Estatísticas</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ background: '#e2e8f0', padding: '1rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
            <strong>Total de Registros</strong>
            <p style={{ fontSize: '2rem', margin: '0' }}>{registros.length}</p>
          </div>
          <div style={{ background: '#e2e8f0', padding: '1rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
            <strong>Funcionários Cadastrados</strong>
            <p style={{ fontSize: '2rem', margin: '0' }}>{funcionarios.length}</p>
          </div>
          <div style={{ background: '#e2e8f0', padding: '1rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
            <strong>Locais de Trabalho</strong>
            <p style={{ fontSize: '2rem', margin: '0' }}>{locais.length}</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Últimos Registros de Ponto</h3>
        <div style={{ maxHeight: '400px', overflow: 'auto' }}>
          {registros.map((reg) => (
            <div key={reg.id} style={{
              borderBottom: '1px solid #e2e8f0', padding: '0.75rem 0', marginBottom: '0.75rem'
            }}>
              <strong>{reg.funcionarios?.nome || 'Funcionário'} - {reg.tipo}</strong>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0' }}>
                {new Date(reg.data_hora).toLocaleString()} - Local: {reg.latitude?.toFixed(4)} , {reg.longitude?.toFixed(4)}
                {reg.precision && ` (${reg.precision} m precision)`}
              </p>
              {reg.local_trabalho_id && <p style={{ fontSize: '0.75rem', color: '#10b981' }}>Validação: Local cadastrado</p>}
            </div>
          ))}
        </div>
        {registros.length === 0 && <p>Nenhum registro encontrado</p>}
      </div>

      <div>
        <h3>Funcionários Cadastrados</h3>
        <ul>
          {funcionarios.map((func) => (
            <li key={func.id} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <strong>{func.nome}</strong> - {func.cargo} - {func.email}
            </li>
          ))}
        </ul>
        {!funcionarios.length && <p>Nenhum funcionário cadastrado</p>}
      </div>

      <div>
        <h3>Locais de Trabalho</h3>
        <ul>
          {locais.map((local) => (
            <li key={local.id} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <strong>{local.nome}</strong> - Raio: {local.radiusMeters}m - {local.latitude?.toFixed(4)} , {local.longitude?.toFixed(4)}
            </li>
          ))}
        </ul>
        {!locais.length && <p>Nenhum local cadastrado</p>}
      </div>
    </div>
  )
}