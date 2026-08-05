# Study Cycle Planner

Prompt para o Lovable — App "Painel de Estudos"

Cole o texto abaixo no chat do Lovable para gerar o app.

Quero criar um app pessoal de gerenciamento de estudos (sem login, uso individual, dados salvos no localStorage do navegador). O app ajuda a montar um cronograma cíclico de revisão baseado no peso de cada matéria e cronometra o tempo estudado em cada sessão.

Modelo de dados (localStorage)

Subject {
  id: string
  name: string
  color: string (hex, gerado automaticamente de uma paleta fixa de 8 cores)
  importance: number (1-5)
  knowledge: number (1-5)
}

Plan {
  weeklyHours: number
  studyDays: string[] // ["domingo","segunda",...]
  minSessionMinutes: number
  maxSessionMinutes: number
}

Session {
  id: string
  subjectId: string
  targetMinutes: number
  studiedSeconds: number
  completed: boolean
  order: number
}

CycleStats {
  completedCycles: number
}

StudyLog {
  id: string
  subjectId: string
  date: string (ISO)
  durationSeconds: number
}


Tela 1 — Wizard "Criar Planejamento" (Etapa 1/3): Disciplinas

Título "Criar Planejamento" com botão X para fechar o modal.

Texto explicativo: "Para cada disciplina, selecione a importância para sua prova e seu grau de conhecimento."

Grid de cards (2 colunas, scroll vertical), um card por disciplina, cada card com:

Nome da disciplina

Slider "Importância" (1 a 5)

Slider "Conhecimento" (1 a 5)

Botão "+ Adicionar disciplina" no topo ou fim da lista, permitindo criar/remover/renomear disciplinas livremente (nome + cor automática da paleta).

Painel lateral direito (fixo, com scroll independente): lista de barras coloridas, uma por disciplina, mostrando o peso calculado em %.

Fórmula do peso: peso_da_materia = importancia_da_materia / soma_de_todas_as_importancias * 100

Atualiza em tempo real conforme os sliders mudam.

Botões "Voltar" (desabilitado nesta etapa) e "Avançar".

Tela 2 — Wizard (Etapa 2/3): Rotina de estudo

Campo numérico "Quantas horas, em média, pretende estudar por semana?"

Seletor de dias da semana: barra horizontal com os 7 dias, toggle multi-seleção (domingo a sábado), estilo pill/tab escura quando selecionado.

Dois selects: "Qual duração mínima e máxima você deseja para uma sessão de estudos (disciplina)?" — opções em minutos (ex: 15, 30, 45, 60, 75, 90, 105, 120).

Botões "Voltar" e "Concluir".

Ao concluir, gerar a sequência de sessões (ver lógica abaixo) e ir para a Tela 3.

Lógica de geração das sessões

Calcular minutos totais = weeklyHours * 60.

Para cada disciplina, minutos alvo = minutos totais * (peso da disciplina / 100).

Quebrar os minutos de cada disciplina em sessões entre minSessionMinutes e maxSessionMinutes (usar o valor médio entre min e max como duração padrão de sessão, ajustando a última sessão de cada disciplina para fechar o total).

Intercalar as sessões de disciplinas diferentes (round-robin ponderado pelo peso) para evitar blocos longos da mesma matéria seguidos — gera repetição espaçada.

Resultado: lista ordenada de Session.

Tela 3 — Dashboard "Planejamento"

Layout em 2 colunas (empilha em mobile):

Cabeçalho: título "Planejamento" + botões "Recomeçar Ciclo" e "Editar Planejamento" (reabre o wizard preenchido com os dados atuais).

Coluna esquerda:

Card "Ciclos completos": número grande dentro de um círculo.

Card "Progresso": barra de progresso horizontal mostrando tempo estudado total / tempo total do ciclo (ex: "0min / 25h00min").

Lista "Sequência dos estudos": cada linha mostra:

Barra colorida lateral (cor da disciplina)

Nome da disciplina

Tempo: studiedSeconds formatado / targetMinutes formatado (ex: "12min / 1h15min")

Um botão de play/pause (ícone) para iniciar/pausar o cronômetro daquela sessão específica

Quando uma sessão atinge o tempo alvo, marcar como concluída (check verde, riscar ou destacar) e parar o timer automaticamente

Apenas uma sessão pode estar com o timer rodando por vez (iniciar uma pausa as outras)

Botão "Ajustar Ciclo" no rodapé da lista

Coluna direita:

Card "Ciclo": roda circular (donut chart) dividida proporcionalmente pelo peso de cada disciplina, com as cores correspondentes, e o total de horas do ciclo no centro (ex: "25h00min")

Abaixo da roda, uma barra horizontal empilhada com as mesmas proporções/cores (segmentos por disciplina)

Botão flutuante de timer (ícone relógio) no canto inferior direito

Página extra — Histórico (nova, não existe no app original)

Adicionar uma aba/página "Histórico" que:

Lista o total de horas estudadas por disciplina (soma de todos os StudyLog), com barra de progresso ou gráfico de barras

Mostra um gráfico simples de horas estudadas por dia (últimos 7-30 dias)

Cada vez que um timer é pausado ou uma sessão é concluída, registrar um StudyLog com a duração daquele trecho estudado

Estilo visual

Paleta clara, cards com cantos arredondados (rounded-2xl), sombra suave

Cor de destaque: verde-menta (#4FD1AE ou similar) para botões primários e sliders

Paleta de cores das disciplinas: tons pastéis distintos (pêssego, menta, azul claro, amarelo, vermelho claro, roxo claro, etc.) — repetir a paleta se houver mais de 8 disciplinas

Tipografia limpa, hierarquia clara entre títulos e labels em maiúsculas pequenas (ex: "IMPORTÂNCIA", "CONHECIMENTO")

Responsivo (funciona bem em mobile, já que o uso principal deve ser no celular)

Persistência

Usar localStorage para: subjects, plan, sessions, cycleStats, studyLogs

Ao "Recomeçar Ciclo": zerar studiedSeconds e completed de todas as sessões, incrementar completedCycles, manter o StudyLog histórico intacto

Ao "Editar Planejamento": reabrir o wizard preenchido com os valores salvos, e ao concluir, regerar a sequência de sessões (perguntar confirmação se já houver progresso no ciclo atual)

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://memoriciclo.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ef4e374f-5886-4922-ae27-e4fe322f87e1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
