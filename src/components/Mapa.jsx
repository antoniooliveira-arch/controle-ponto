import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export default function Mapa() {
  const [locais, setLocais] = useState([])
  const [registros, setRegistros] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function carregarDados() {
      try {
        const { data: locaisData } = await supabase.from('locais_trabalho').select('*')
        const { data: registrosData } = await supabase
          .from('registros_ponto')
          .select(`
            *,
            funcionarios (nome, cargo)
          `)
        setLocais(locaisData || [])
        setRegistros(registrosData || [])
      } catch (e) {
        setError('Erro ao carregar dados: ' + e.message)
      }
    }
    carregarDados()
  }, [])

  if (error) {
    return <div style={{ padding: '2rem' }}>Erro: {error}</div>
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <h2>Mapa de Localizações</h2>
      
      <div style={{ marginBottom: '2rem' }}>
        <h3>Locais de Trabalho Cadastrados</h3>
        <ul>
          {locais.map((local) => (
            <li key={local.id} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <strong>{local.nome}</strong> - 
              Lat: {local.latitude.toFixed(4)} , Lng: {local.longitude.toFixed(4)} - 
              Raio: {local.radiusMeters} m
            </li>
          ))}
        </ul>
        {!locais.length && <p>Nenhum local cadastrado</p>}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Registros de Ponto Recentes</h3>
        <ul>
          {registros.slice(0, 10).map((reg) => (
            <li key={reg.id} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <strong>{reg.funcionarios?.nome || 'Funcionário'} - 
              {new Date(reg.data_hora).toLocaleString()} - 
              {reg.tipo}: Lat {reg.latitude?.toFixed(4)} , Lng {reg.longitude?.toFixed(4)}
              {reg.precision && ` (precisão: ${reg.precision} m)`}
              </strong>
            </li>
          ))}
        </ul>
        {!registros.length && <p>Nenhum registro</p>}
      </div>
    </div>
  )
}