import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getFuncionarios() {
  const { data, error } = await supabase
    .from('funcionarios')
    .select('*')
  if (error) throw error
  return data
}

export async function createFuncionario(funcionario) {
  const { data, error } = await supabase
    .from('funcionarios')
    .insert([funcionario])
    .select()
  if (error) throw error
  return data
}

export async function updateFuncionario(id, dados) {
  const { data, error } = await supabase
    .from('funcionarios')
    .update(dados)
    .eq('id', id)
    .select()
  if (error) throw error
  return data
}

export async function deleteFuncionario(id) {
  const { error } = await supabase
    .from('funcionarios')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getLocaisTrabalho() {
  const { data, error } = await supabase
    .from('locais_trabalho')
    .select('*')
  if (error) throw error
  return data
}

export async function createLocalTrabalho(local) {
  const { data, error } = await supabase
    .from('locais_trabalho')
    .insert([local])
    .select()
  if (error) throw error
  return data
}

export async function getRegistrosPonto(
  filters = {}
) {
  let query = supabase
    .from('registros_ponto')
    .select(`
      *,
      funcionarios (nome, cargo)
    `)
  
  if (filters.funcionarioId) {
    query = query.eq('funcionario_id', filters.funcionarioId)
  }
  if (filters.dataInicial) {
    query = query.gte('data_hora', filters.dataInicial)
  }
  if (filters.dataFinal) {
    query = query.lte('data_hora', filters.dataFinal)
  }
  if (filters.localId) {
    query = query.eq('local_trabalho_id', filters.localId)
  }
  
  const { data, error } = await query.order('data_hora', { ascending: false })
  if (error) throw error
  return data
}

export async function createRegistroPonto(registro) {
  const { data, error } = await supabase
    .from('registros_ponto')
    .insert([registro])
    .select()
  if (error) throw error
  return data
}