const { createApp, ref, reactive, computed, watch } = Vue

let bancoPronto = null

function banco() {
  if (!bancoPronto) {
    bancoPronto = new Promise((resolve, reject) => {
      const pedido = indexedDB.open('barbearia-db', 1)
      pedido.onupgradeneeded = () => pedido.result.createObjectStore('dados')
      pedido.onsuccess = () => resolve(pedido.result)
      pedido.onerror = () => reject(pedido.error)
    })
  }
  return bancoPronto
}

async function carregar(chave, padrao) {
  const db = await banco()
  return new Promise((resolve) => {
    const pedido = db.transaction('dados', 'readonly').objectStore('dados').get(chave)
    pedido.onsuccess = () => resolve(pedido.result === undefined ? padrao : pedido.result)
    pedido.onerror = () => resolve(padrao)
  })
}

async function guardar(chave, valor) {
  const db = await banco()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('dados', 'readwrite')
    tx.objectStore('dados').put(JSON.parse(JSON.stringify(valor)), chave)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

const Logo = {
  props: { tamanho: { type: Number, default: 40 } },
  template: `
    <svg :width="tamanho" :height="tamanho" viewBox="0 0 48 48" fill="none"
         stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-label="Logo">
      <circle cx="14" cy="36" r="6" />
      <circle cx="34" cy="36" r="6" />
      <path d="M18 31 L34 6" />
      <path d="M30 31 L14 6" />
    </svg>
  `,
}

const Login = {
  components: { Logo },
  props: { conta: { type: Object, default: null } },
  emits: ['entrar', 'cadastrar'],
  setup(props, { emit }) {
    const modo = ref('entrar')
    const nomeBarbearia = ref('')
    const usuario = ref('')
    const senha = ref('')
    const erro = ref('')

    function trocarModo(novo) {
      modo.value = novo
      erro.value = ''
    }

    function enviar() {
      erro.value = ''
      const u = usuario.value.trim()

      if (modo.value === 'entrar') {
        const contaCadastrada =
          props.conta && u === props.conta.usuario && senha.value === props.conta.senha
        const contaTeste = u === USUARIO && senha.value === SENHA
        if (!contaCadastrada && !contaTeste) {
          erro.value = 'Usuário ou senha incorretos.'
          return
        }
        emit('entrar')
      } else {
        if (!nomeBarbearia.value.trim() || !u || senha.value.length < 4) {
          erro.value = 'Preencha tudo. A senha precisa ter pelo menos 4 caracteres.'
          return
        }
        emit('cadastrar', { nome: nomeBarbearia.value.trim(), usuario: u, senha: senha.value })
      }
    }

    return { modo, nomeBarbearia, usuario, senha, erro, trocarModo, enviar }
  },
  template: `
    <div class="login-tela">
      <form class="card login" @submit.prevent="enviar">
        <div class="login-logo">
          <Logo :tamanho="56" />
          <h1>Barbearia</h1>
        </div>
        <p class="sub">
          {{ modo === 'entrar' ? 'Entre para gerenciar a agenda' : 'Cadastre a sua barbearia' }}
        </p>

        <label v-if="modo === 'cadastrar'">
          Nome da barbearia
          <input v-model="nomeBarbearia" type="text" placeholder="Ex.: Barbearia do Zé" />
        </label>

        <label>
          Usuário
          <input v-model="usuario" type="text" />
        </label>

        <label>
          Senha
          <input v-model="senha" type="password" />
        </label>

        <p v-if="erro" class="erro">{{ erro }}</p>

        <button class="btn btn-largo" type="submit">
          {{ modo === 'entrar' ? 'Entrar' : 'Cadastrar e entrar' }}
        </button>

        <button v-if="modo === 'entrar'" class="link" type="button" @click="trocarModo('cadastrar')">
          Sou barbeiro: cadastrar minha barbearia
        </button>
        <button v-else class="link" type="button" @click="trocarModo('entrar')">
          Já tenho cadastro: entrar
        </button>

        <p v-if="modo === 'entrar'" class="sub">Conta de teste: admin / 1234</p>
      </form>
    </div>
  `,
}

const Sidebar = {
  components: { Logo },
  props: {
    nome: { type: String, default: '' },
    tela: { type: String, required: true },
  },
  emits: ['ir', 'sair'],
  setup() {
    const itens = [
      { id: 'agenda', texto: 'Agendamentos' },
      { id: 'barbearia', texto: 'Minha barbearia' },
    ]
    return { itens }
  },
  template: `
    <aside class="sidebar">
      <div class="marca">
        <Logo :tamanho="40" />
        <div class="marca-textos">
          <span class="marca-nome">{{ nome || 'BARBEARIA' }}</span>
          <span class="marca-sub">Agenda</span>
        </div>
      </div>

      <nav class="menu">
        <button
          v-for="item in itens"
          :key="item.id"
          class="menu-item"
          :class="{ ativo: tela === item.id }"
          @click="$emit('ir', item.id)"
        >
          {{ item.texto }}
        </button>
      </nav>

      <button class="btn btn-cinza btn-largo" @click="$emit('sair')">Sair</button>
    </aside>
  `,
}

const FormAgendamento = {
  props: {
    agendamentos: { type: Array, required: true },
    barbeiros: { type: Array, required: true },
    servicos: { type: Array, required: true },
    editando: { type: Object, default: null },
  },
  emits: ['salvar', 'cancelar'],
  setup(props, { emit }) {
    const erro = ref('')

    function formVazio() {
      return { id: null, cliente: '', servicoIds: [], barbeiro: '', data: '', horario: '' }
    }
    const form = reactive(formVazio())

    const hoje = new Date().toLocaleDateString('en-CA')

    watch(
      () => props.editando,
      (novo) => {
        if (!novo) {
          Object.assign(form, formVazio())
          erro.value = ''
          return
        }

        let ids = Array.isArray(novo.servicoIds)
          ? novo.servicoIds.filter((id) => props.servicos.some((s) => s.id === id))
          : []

        if (ids.length === 0 && novo.servico) {
          const partes = novo.servico.split('+').map((p) => p.trim().toLowerCase())
          ids = props.servicos
            .filter((s) => partes.includes(s.nome.toLowerCase()))
            .map((s) => s.id)
        }

        Object.assign(form, { ...formVazio(), ...novo, servicoIds: ids })
        erro.value = ''
      }
    )

    watch(
      () => [form.data, form.barbeiro],
      () => {
        if (form.horario && !horarioLivre(form.horario)) form.horario = ''
      }
    )

    function horarioLivre(horario) {
      return !props.agendamentos.some(
        (a) =>
          a.data === form.data &&
          a.barbeiro === form.barbeiro &&
          a.horario === horario &&
          a.id !== form.id
      )
    }

    const horarios = computed(() =>
      HORARIOS.map((h) => ({ hora: h, livre: horarioLivre(h) }))
    )

    const podeEscolherHorario = computed(() => form.data && form.barbeiro)

    const servicosEscolhidos = computed(() =>
      props.servicos.filter((s) => form.servicoIds.includes(s.id))
    )

    const total = computed(() =>
      servicosEscolhidos.value.reduce((soma, s) => soma + Number(s.preco || 0), 0)
    )

    const cadastroCompleto = computed(
      () => props.barbeiros.length > 0 && props.servicos.length > 0
    )

    function enviar() {
      const escolhidos = servicosEscolhidos.value
      if (
        !form.cliente.trim() ||
        escolhidos.length === 0 ||
        !props.barbeiros.includes(form.barbeiro) ||
        !form.data ||
        !form.horario
      ) {
        erro.value = 'Preencha todos os campos, escolha ao menos um serviço e um horário.'
        return
      }
      erro.value = ''
      emit('salvar', {
        ...form,
        cliente: form.cliente.trim(),
        servicoIds: escolhidos.map((s) => s.id),
        servico: escolhidos.map((s) => s.nome).join(' + '),
        preco: total.value,
      })
      Object.assign(form, formVazio())
    }

    function cancelar() {
      Object.assign(form, formVazio())
      erro.value = ''
      emit('cancelar')
    }

    return {
      erro,
      form,
      hoje,
      horarios,
      podeEscolherHorario,
      servicosEscolhidos,
      total,
      cadastroCompleto,
      enviar,
      cancelar,
      formatarPreco,
    }
  },
  template: `
    <form class="card" @submit.prevent="enviar">
      <h2>{{ form.id ? 'Editar agendamento' : 'Novo agendamento' }}</h2>

      <p v-if="!cadastroCompleto" class="aviso">
        Cadastre pelo menos um barbeiro e um serviço em "Minha barbearia".
      </p>

      <template v-else>
        <div class="linha">
          <label>
            Nome do cliente
            <input v-model="form.cliente" type="text" placeholder="Ex.: João Silva" />
          </label>

          <label>
            Barbeiro
            <select v-model="form.barbeiro">
              <option value="" disabled>Escolha o barbeiro</option>
              <option v-for="b in barbeiros" :key="b" :value="b">{{ b }}</option>
            </select>
          </label>

          <label>
            Data
            <input v-model="form.data" type="date" :min="form.id ? null : hoje" />
          </label>
        </div>

        <div>
          <p class="rotulo">Serviços (escolha um ou mais)</p>
          <div class="opcoes">
            <label
              v-for="s in servicos"
              :key="s.id"
              class="opcao"
              :class="{ ativa: form.servicoIds.includes(s.id) }"
            >
              <input type="checkbox" :value="s.id" v-model="form.servicoIds" />
              <span>{{ s.nome }}</span>
              <span class="preco">{{ formatarPreco(s.preco) }}</span>
            </label>
          </div>
        </div>

        <p v-if="servicosEscolhidos.length" class="valor">
          Total: {{ formatarPreco(total) }}
        </p>

        <div>
          <p class="rotulo">Horário</p>

          <p v-if="!podeEscolherHorario" class="aviso">
            Escolha o barbeiro e a data para ver os horários disponíveis.
          </p>

          <div v-else class="horarios">
            <button
              v-for="h in horarios"
              :key="h.hora"
              type="button"
              class="horario"
              :class="{ ativo: form.horario === h.hora }"
              :disabled="!h.livre"
              :title="h.livre ? 'Disponível' : 'Já está ocupado'"
              @click="form.horario = h.hora"
            >
              {{ h.hora }}
            </button>
          </div>
        </div>

        <p v-if="erro" class="erro">{{ erro }}</p>

        <div class="acoes">
          <button class="btn" type="submit">
            {{ form.id ? 'Salvar alterações' : 'Agendar' }}
          </button>
          <button v-if="form.id" class="btn btn-cinza" type="button" @click="cancelar">
            Cancelar
          </button>
        </div>
      </template>
    </form>
  `,
}

const ListaAgendamentos = {
  props: { agendamentos: { type: Array, required: true } },
  emits: ['editar', 'excluir'],
  setup(props) {
    const ordenados = computed(() =>
      [...props.agendamentos].sort((a, b) =>
        (a.data + a.horario).localeCompare(b.data + b.horario)
      )
    )

    const total = computed(() =>
      props.agendamentos.reduce((soma, a) => soma + Number(a.preco || 0), 0)
    )

    function formatarData(data) {
      const [ano, mes, dia] = data.split('-')
      return dia + '/' + mes + '/' + ano
    }

    return { ordenados, total, formatarData, formatarPreco }
  },
  template: `
    <section class="card">
      <div class="cabecalho-card">
        <h2>Agendamentos ({{ agendamentos.length }})</h2>
        <p v-if="agendamentos.length" class="valor">Total previsto: {{ formatarPreco(total) }}</p>
      </div>

      <p v-if="agendamentos.length === 0" class="aviso">
        Nenhum agendamento ainda. Crie o primeiro acima.
      </p>

      <ul v-else class="lista">
        <li v-for="a in ordenados" :key="a.id" class="item">
          <div class="quando">
            <strong>{{ a.horario }}</strong>
            <span>{{ formatarData(a.data) }}</span>
          </div>

          <div class="info">
            <strong>{{ a.cliente }}</strong>
            <span>{{ a.servico }} - {{ formatarPreco(a.preco) }}</span>
            <span>Barbeiro: {{ a.barbeiro }}</span>
          </div>

          <div class="acoes">
            <button class="btn btn-pequeno" @click="$emit('editar', a)">Editar</button>
            <button class="btn btn-pequeno btn-perigo" @click="$emit('excluir', a.id)">
              Excluir
            </button>
          </div>
        </li>
      </ul>
    </section>
  `,
}

const PainelBarbearia = {
  props: {
    barbearia: { type: Object, required: true },
    barbeiros: { type: Array, required: true },
    servicos: { type: Array, required: true },
    agendamentos: { type: Array, default: () => [] },
  },
  emits: ['salvar-barbearia', 'add-barbeiro', 'remover-barbeiro', 'add-servico', 'remover-servico'],
  setup(props, { emit }) {
    const dados = reactive({ ...props.barbearia })
    const msg = ref('')
    const erroDados = ref('')

    function salvarDados() {
      if (!dados.nome.trim()) {
        msg.value = ''
        erroDados.value = 'Informe o nome da barbearia.'
        return
      }
      erroDados.value = ''
      emit('salvar-barbearia', { ...dados, nome: dados.nome.trim() })
      msg.value = 'Dados salvos.'
    }

    const novoBarbeiro = ref('')
    const erroBarbeiro = ref('')

    function adicionarBarbeiro() {
      const nome = novoBarbeiro.value.trim()
      if (!nome) {
        erroBarbeiro.value = 'Digite o nome do barbeiro.'
        return
      }
      const repetido = props.barbeiros.some((b) => b.toLowerCase() === nome.toLowerCase())
      if (repetido) {
        erroBarbeiro.value = 'Esse barbeiro já está cadastrado.'
        return
      }
      erroBarbeiro.value = ''
      emit('add-barbeiro', nome)
      novoBarbeiro.value = ''
    }

    const novoServico = ref('')
    const novoPreco = ref('')
    const erroServico = ref('')

    function adicionarServico() {
      const nome = novoServico.value.trim()
      const preco = Number(novoPreco.value)
      if (!nome || !(preco > 0)) {
        erroServico.value = 'Informe o nome e um valor maior que zero.'
        return
      }
      erroServico.value = ''
      emit('add-servico', { nome, preco })
      novoServico.value = ''
      novoPreco.value = ''
    }

    const agendamentosOrdenados = computed(() =>
      [...props.agendamentos].sort((a, b) =>
        (a.data + a.horario).localeCompare(b.data + b.horario)
      )
    )

    const totalAgendamentos = computed(() =>
      props.agendamentos.reduce((soma, a) => soma + Number(a.preco || 0), 0)
    )

    function formatarData(data) {
      const [ano, mes, dia] = data.split('-')
      return dia + '/' + mes + '/' + ano
    }

    return {
      dados, msg, erroDados, salvarDados,
      novoBarbeiro, erroBarbeiro, adicionarBarbeiro,
      novoServico, novoPreco, erroServico, adicionarServico,
      agendamentosOrdenados, totalAgendamentos, formatarData,
      formatarPreco,
    }
  },
  template: `
    <div class="coluna">
      <form class="card" @submit.prevent="salvarDados">
        <h2>Dados da barbearia</h2>
        <div class="linha">
          <label>
            Nome da barbearia
            <input v-model="dados.nome" type="text" />
          </label>
          <label>
            Telefone
            <input v-model="dados.telefone" type="text" placeholder="(86) 90000-0000" />
          </label>
        </div>
        <label>
          Endereço
          <input v-model="dados.endereco" type="text" placeholder="Rua, número, bairro" />
        </label>
        <p v-if="erroDados" class="erro">{{ erroDados }}</p>
        <p v-if="msg" class="sucesso">{{ msg }}</p>
        <div class="acoes">
          <button class="btn" type="submit">Salvar dados</button>
        </div>
      </form>

      <section class="card">
        <h2>Barbeiros ({{ barbeiros.length }})</h2>
        <form class="linha linha-fim" @submit.prevent="adicionarBarbeiro">
          <label>
            Nome do barbeiro
            <input v-model="novoBarbeiro" type="text" placeholder="Ex.: Marcos" />
          </label>
          <button class="btn" type="submit">Adicionar</button>
        </form>
        <p v-if="erroBarbeiro" class="erro">{{ erroBarbeiro }}</p>
        <p v-if="barbeiros.length === 0" class="aviso">Nenhum barbeiro cadastrado.</p>
        <ul v-else class="lista">
          <li v-for="b in barbeiros" :key="b" class="item">
            <div class="info"><strong>{{ b }}</strong></div>
            <div class="acoes">
              <button class="btn btn-pequeno btn-perigo" @click="$emit('remover-barbeiro', b)">
                Remover
              </button>
            </div>
          </li>
        </ul>
      </section>

      <section class="card">
        <h2>Serviços e valores ({{ servicos.length }})</h2>
        <form class="linha linha-fim" @submit.prevent="adicionarServico">
          <label>
            Serviço
            <input v-model="novoServico" type="text" placeholder="Ex.: Hidratação" />
          </label>
          <label>
            Valor (R$)
            <input v-model="novoPreco" type="number" min="0" step="0.01" placeholder="0,00" />
          </label>
          <button class="btn" type="submit">Adicionar</button>
        </form>
        <p v-if="erroServico" class="erro">{{ erroServico }}</p>
        <p v-if="servicos.length === 0" class="aviso">Nenhum serviço cadastrado.</p>
        <ul v-else class="lista">
          <li v-for="s in servicos" :key="s.id" class="item">
            <div class="info">
              <strong>{{ s.nome }}</strong>
              <span>{{ formatarPreco(s.preco) }}</span>
            </div>
            <div class="acoes">
              <button class="btn btn-pequeno btn-perigo" @click="$emit('remover-servico', s.id)">
                Remover
              </button>
            </div>
          </li>
        </ul>
      </section>

      <section class="card">
        <div class="cabecalho-card">
          <h2>Agendamentos ({{ agendamentos.length }})</h2>
          <p v-if="agendamentos.length" class="valor">
            Total previsto: {{ formatarPreco(totalAgendamentos) }}
          </p>
        </div>

        <p v-if="agendamentos.length === 0" class="aviso">
          Nenhum agendamento registrado ainda.
        </p>

        <ul v-else class="lista">
          <li v-for="a in agendamentosOrdenados" :key="a.id" class="item">
            <div class="quando">
              <strong>{{ a.horario }}</strong>
              <span>{{ formatarData(a.data) }}</span>
            </div>

            <div class="info">
              <strong>{{ a.cliente }}</strong>
              <span>{{ a.servico }} - {{ formatarPreco(a.preco) }}</span>
              <span>Barbeiro: {{ a.barbeiro }}</span>
            </div>
          </li>
        </ul>
      </section>
    </div>
  `,
}

const App = {
  components: { Login, Sidebar, FormAgendamento, ListaAgendamentos, PainelBarbearia },
  props: { inicial: { type: Object, required: true } },
  setup(props) {
    const logado = ref(false)
    const tela = ref('agenda')
    const editando = ref(null)

    const conta = ref(props.inicial.conta)
    const barbearia = ref(props.inicial.barbearia)
    const barbeiros = ref(props.inicial.barbeiros)
    const servicos = ref(props.inicial.servicos)
    const agendamentos = ref(props.inicial.agendamentos)

    watch(conta, (v) => guardar('conta', v), { deep: true })
    watch(barbearia, (v) => guardar('barbearia', v), { deep: true })
    watch(barbeiros, (v) => guardar('barbeiros', v), { deep: true })
    watch(servicos, (v) => guardar('servicos', v), { deep: true })
    watch(agendamentos, (v) => guardar('agendamentos', v), { deep: true })

    function entrar() {
      logado.value = true
      tela.value = 'agenda'
    }
    function cadastrar(novaConta) {
      conta.value = { usuario: novaConta.usuario, senha: novaConta.senha }
      barbearia.value = { ...barbearia.value, nome: novaConta.nome }
      logado.value = true
      tela.value = 'barbearia'
    }
    function sair() {
      logado.value = false
      editando.value = null
    }
    function irPara(nova) {
      tela.value = nova
    }

    function salvar(a) {
      if (a.id) {
        agendamentos.value = agendamentos.value.map((x) => (x.id === a.id ? a : x))
      } else {
        agendamentos.value.push({ ...a, id: Date.now() })
      }
      editando.value = null
    }
    function excluir(id) {
      if (!confirm('Excluir este agendamento?')) return
      agendamentos.value = agendamentos.value.filter((a) => a.id !== id)
    }
    function editar(a) {
      editando.value = a
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    function cancelar() {
      editando.value = null
    }

    function salvarBarbearia(dados) {
      barbearia.value = { ...dados }
    }
    function addBarbeiro(nome) {
      barbeiros.value.push(nome)
    }
    function removerBarbeiro(nome) {
      if (!confirm('Remover ' + nome + '?')) return
      barbeiros.value = barbeiros.value.filter((b) => b !== nome)
    }
    function addServico(s) {
      servicos.value.push({ id: Date.now(), nome: s.nome, preco: s.preco })
    }
    function removerServico(id) {
      servicos.value = servicos.value.filter((s) => s.id !== id)
    }

    return {
      logado, tela, editando, conta, barbearia, barbeiros, servicos, agendamentos,
      entrar, cadastrar, sair, irPara,
      salvar, excluir, editar, cancelar,
      salvarBarbearia, addBarbeiro, removerBarbeiro, addServico, removerServico,
    }
  },
  template: `
    <Login v-if="!logado" :conta="conta" @entrar="entrar" @cadastrar="cadastrar" />

    <div v-else class="app">
      <Sidebar :nome="barbearia.nome" :tela="tela" @ir="irPara" @sair="sair" />

      <main class="conteudo">
        <div v-if="tela === 'agenda'" class="coluna">
          <FormAgendamento
            :agendamentos="agendamentos"
            :barbeiros="barbeiros"
            :servicos="servicos"
            :editando="editando"
            @salvar="salvar"
            @cancelar="cancelar"
          />
          <ListaAgendamentos :agendamentos="agendamentos" @editar="editar" @excluir="excluir" />
        </div>

        <PainelBarbearia
          v-else
          :barbearia="barbearia"
          :barbeiros="barbeiros"
          :servicos="servicos"
          :agendamentos="agendamentos"
          @salvar-barbearia="salvarBarbearia"
          @add-barbeiro="addBarbeiro"
          @remover-barbeiro="removerBarbeiro"
          @add-servico="addServico"
          @remover-servico="removerServico"
        />
      </main>
    </div>
  `,
}

async function iniciar() {
  const inicial = {
    conta: await carregar('conta', null),
    barbearia: await carregar('barbearia', { nome: '', endereco: '', telefone: '' }),
    barbeiros: await carregar('barbeiros', [...BARBEIROS_PADRAO]),
    servicos: await carregar('servicos', SERVICOS_PADRAO.map((s) => ({ ...s }))),
    agendamentos: await carregar('agendamentos', []),
  }
  createApp(App, { inicial }).mount('#app')
}

iniciar()