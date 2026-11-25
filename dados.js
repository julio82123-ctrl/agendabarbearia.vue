// Dados iniciais da barbearia. O dono pode editar tudo na tela "Minha barbearia".
const BARBEIROS_PADRAO = ['Carlos', 'Rafael', 'Diego']

// Serviços e preços iniciais
const SERVICOS_PADRAO = [
  { id: 1, nome: 'Corte', preco: 35 },
  { id: 2, nome: 'Barba', preco: 25 },
  { id: 3, nome: 'Corte + Barba', preco: 55 },
  { id: 4, nome: 'Sobrancelha', preco: 15 },
  { id: 5, nome: 'Pezinho', preco: 10 },
]

// Horários de atendimento (fixos)
const HORARIOS = [
  '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00', '18:00',
]

// Conta de teste para entrar sem cadastrar (didático)
const USUARIO = 'admin'
const SENHA = '1234'

// Transforma 35 em "R$ 35,00"
function formatarPreco(valor) {
  return 'R$ ' + Number(valor).toFixed(2).replace('.', ',')
}
