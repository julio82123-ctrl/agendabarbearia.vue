const BARBEIROS_PADRAO = ['Carlos', 'Rafael', 'Diego']

const SERVICOS_PADRAO = [
  { id: 1, nome: 'Corte', preco: 35 },
  { id: 2, nome: 'Barba', preco: 25 },
  { id: 3, nome: 'Sobrancelha', preco: 15 },
  { id: 4, nome: 'Pezinho', preco: 10 },
]

const HORARIOS = [
  '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00', '18:00',
]

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const DIAS_PADRAO = [1, 2, 3, 4, 5, 6]

const USUARIO = 'admin'
const SENHA = '1234'

function formatarPreco(valor) {
  return 'R$ ' + Number(valor).toFixed(2).replace('.', ',')
}