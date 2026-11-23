// Pega do Vue só as ferramentas que vamos usar
const { createApp, ref, reactive, computed, watch } = Vue

/* ============================================================
   LOGO: o desenho do poste de barbeiro
   ============================================================ */
const Logo = {
  props: {
    tamanho: { type: Number, default: 48 },
  },
  template: `
    <svg :width="tamanho" :height="tamanho" viewBox="0 0 48 48" fill="none"
         xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Logo da barbearia">
      <defs>
        <clipPath id="poste">
          <rect x="18" y="10" width="12" height="28" rx="2" />
        </clipPath>
      </defs>

      <rect x="16" y="4" width="16" height="6" rx="2" fill="currentColor" />
      <rect x="16" y="38" width="16" height="6" rx="2" fill="currentColor" />

      <g clip-path="url(#poste)" stroke="currentColor" stroke-width="3.5">
        <line x1="14" y1="16" x2="34" y2="8" />
        <line x1="14" y1="24" x2="34" y2="16" />
        <line x1="14" y1="32" x2="34" y2="24" />
        <line x1="14" y1="40" x2="34" y2="32" />
      </g>

      <rect x="18" y="10" width="12" height="28" rx="2" stroke="currentColor" stroke-width="1.5" />
    </svg>
  `,
}

/* ============================================================
   LOGIN: a porta da barbearia
   ============================================================ */
const Login = {
  components: { Logo },
  emits: ['entrar'],
  setup(props, { emit }) {
    const usuario = ref('')
    const senha = ref('')
    const erro = ref('')

    function entrar() {
      if (usuario.value === USUARIO && senha.value === SENHA) {
        erro.value = ''
        emit('entrar')
      } else {
        erro.value = 'Usuário ou senha incorretos.'
      }
    }

    return { usuario, senha, erro, entrar }
  },
  template: `
    <div class="login-tela">
      <form class="card login" @submit.prevent="entrar">
        <div class="login-logo">
          <Logo :tamanho="72" />
          <h1>Barbearia</h1>
          <p class="sub">Entre para acessar a agenda</p>
        </div>

        <label>
          Usuário
          <input v-model="usuario" type="text" autocomplete="username" autofocus />
        </label>

        <label>
          Senha
          <input v-model="senha" type="password" autocomplete="current-password" />
        </label>

        <p v-if="erro" class="erro">{{ erro }}</p>

        <button class="btn btn-largo" type="submit">Entrar</button>
      </form>
    </div>
  `,
}

/* ============================================================
   SIDEBAR: o menu lateral
   ============================================================ */
const Sidebar = {
  components: { Logo },
  props: {
    tela: { type: String, required: true },
  },
  emits: ['ir', 'sair'],
  setup() {
    const itens = [
      { nome: 'agendamentos', texto: 'Agendamentos' },
      { nome: 'novo', texto: 'Novo agendamento' },
    ]
    return { itens }
  },
  template: `
    <aside class="sidebar">
      <div class="marca">
        <Logo :tamanho="40" />
        <div class="marca-textos">
          <span class="marca-nome">BARBEARIA</span>
          <span class="marca-sub">Agenda online</span>
        </div>
      </div>

      <nav class="menu">
        <button
          v-for="item in itens"
          :key="item.nome"
          class="menu-item"
          :class="{ ativo: tela === item.nome }"
          @click="$emit('ir', item.nome)"
        >
          {{ item.texto }}
        </button>
      </nav>

      <button class="menu-item" @click="$emit('sair')">Sair</button>
    </aside>
  `,
}

/* ============================================================
   FORMULÁRIO: o balcão onde se marca o horário
   ============================================================ */
const FormAgendamento = {
  props: {
    agendamentos: { type: Array, required: true },
    editando: { type: Object, default: null },
  },
  emits: ['salvar', 'cancelar'],
  setup(props, { emit }) {
    const erro = ref('')

    // Se veio um agendamento para editar, o formulário já começa preenchido
    const form = reactive(
      props.editando
        ? { ...props.editando }
        : { id: null, cliente: '', barbeiro: '', data: '', horario: '' }
    )

    // Data de hoje no formato do input date (AAAA-MM-DD)
    const hoje = new Date().toLocaleDateString('en-CA')

    // Um horário está livre se ninguém marcou com o mesmo barbeiro na mesma data
    function horarioLivre(horario) {
      return !props.agendamentos.some(
        (a) =>
          a.data === form.data &&
          a.barbeiro === form.barbeiro &&
          a.horario === horario &&
          a.id !== form.id
      )
    }

    // Se trocar a data ou o barbeiro, o horário escolhido pode já estar ocupado
    watch(
      () => [form.data, form.barbeiro],
      () => {
        if (form.horario && !horarioLivre(form.horario)) form.horario = ''
      }
    )

    const horarios = computed(() =>
      HORARIOS.map((h) => ({ hora: h, livre: horarioLivre(h) }))
    )

    const podeEscolherHorario = computed(() => form.data && form.barbeiro)

    function enviar() {
      if (!form.cliente.trim() || !form.barbeiro || !form.data || !form.horario) {
        erro.value = 'Preencha todos os campos e escolha um horário.'
        return
      }
      erro.value = ''
      emit('salvar', { ...form, cliente: form.cliente.trim() })
    }

    return { BARBEIROS, erro, form, hoje, horarios, podeEscolherHorario, enviar }
  },
  template: `
    <form class="card" @submit.prevent="enviar">
      <h2>{{ form.id ? 'Editar agendamento' : 'Novo agendamento' }}</h2>

      <div class="linha">
        <label>
          Nome do cliente
          <input v-model="form.cliente" type="text" placeholder="Ex.: João Silva" />
        </label>

        <label>
          Barbeiro
          <select v-model="form.barbeiro">
            <option value="" disabled>Escolha o barbeiro</option>
            <option v-for="b in BARBEIROS" :key="b" :value="b">{{ b }}</option>
          </select>
        </label>

        <label>
          Data
          <input v-model="form.data" type="date" :min="hoje" />
        </label>
      </div>

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
        <button class="btn btn-cinza" type="button" @click="$emit('cancelar')">
          Cancelar
        </button>
      </div>
    </form>
  `,
}

/* ============================================================
   LISTA: o caderno aberto na recepção
   ============================================================ */
const ListaAgendamentos = {
  props: {
    agendamentos: { type: Array, required: true },
  },
  emits: ['editar', 'excluir'],
  setup(props) {
    // Ordena por data e depois por horário
    const ordenados = computed(() =>
      [...props.agendamentos].sort((a, b) =>
        (a.data + a.horario).localeCompare(b.data + b.horario)
      )
    )

    // Transforma 2026-11-23 em 23/11/2026
    function formatarData(data) {
      const [ano, mes, dia] = data.split('-')
      return dia + '/' + mes + '/' + ano
    }

    return { ordenados, formatarData }
  },
  template: `
    <section class="card">
      <h2>Agendamentos ({{ agendamentos.length }})</h2>

      <p v-if="agendamentos.length === 0" class="aviso">
        Nenhum agendamento ainda. Clique em "Novo agendamento" para criar o primeiro.
      </p>

      <ul v-else class="lista">
        <li v-for="a in ordenados" :key="a.id" class="item">
          <div class="quando">
            <strong>{{ a.horario }}</strong>
            <span>{{ formatarData(a.data) }}</span>
          </div>

          <div class="info">
            <strong>{{ a.cliente }}</strong>
            <span>Barbeiro: {{ a.barbeiro }}</span>
          </div>

          <div class="acoes">
            <button class="btn btn-pequeno btn-cinza" @click="$emit('editar', a)">Editar</button>
            <button class="btn btn-pequeno btn-perigo" @click="$emit('excluir', a.id)">Excluir</button>
          </div>
        </li>
      </ul>
    </section>
  `,
}

/* ============================================================
   APP: o gerente da barbearia
   ============================================================ */
const App = {
  components: { Login, Sidebar, FormAgendamento, ListaAgendamentos },
  setup() {
    const logado = ref(localStorage.getItem('logado') === 'true')
    const agendamentos = ref(JSON.parse(localStorage.getItem('agendamentos') || '[]'))
    const editando = ref(null)

    // Qual "sala" está aberta: 'agendamentos' ou 'novo'
    const tela = ref('agendamentos')

    // Toda vez que a lista mudar, salva no navegador
    watch(
      agendamentos,
      (valor) => localStorage.setItem('agendamentos', JSON.stringify(valor)),
      { deep: true }
    )

    function entrar() {
      logado.value = true
      localStorage.setItem('logado', 'true')
      tela.value = 'agendamentos'
    }

    function sair() {
      logado.value = false
      editando.value = null
      localStorage.removeItem('logado')
    }

    function irPara(nome) {
      editando.value = null
      tela.value = nome
    }

    function salvar(agendamento) {
      if (agendamento.id) {
        // Já existe: atualiza (EDITAR)
        const posicao = agendamentos.value.findIndex((a) => a.id === agendamento.id)
        if (posicao !== -1) agendamentos.value[posicao] = agendamento
      } else {
        // Não existe: cria um novo (ADICIONAR)
        agendamentos.value.push({ ...agendamento, id: Date.now() })
      }
      editando.value = null
      tela.value = 'agendamentos'
    }

    function excluir(id) {
      agendamentos.value = agendamentos.value.filter((a) => a.id !== id)
    }

    function editar(agendamento) {
      editando.value = { ...agendamento }
      tela.value = 'novo'
    }

    function cancelar() {
      editando.value = null
      tela.value = 'agendamentos'
    }

    return {
      logado, agendamentos, editando, tela,
      entrar, sair, irPara, salvar, excluir, editar, cancelar,
    }
  },
  template: `
    <Login v-if="!logado" @entrar="entrar" />

    <div v-else class="app">
      <Sidebar :tela="tela" @ir="irPara" @sair="sair" />

      <main class="conteudo">
        <div class="coluna">
          <ListaAgendamentos
            v-if="tela === 'agendamentos'"
            :agendamentos="agendamentos"
            @editar="editar"
            @excluir="excluir"
          />

          <FormAgendamento
            v-else
            :key="editando ? editando.id : 'novo'"
            :agendamentos="agendamentos"
            :editando="editando"
            @salvar="salvar"
            @cancelar="cancelar"
          />
        </div>
      </main>
    </div>
  `,
}

// Liga o aplicativo na <div id="app"> do index.html
createApp(App).mount('#app')