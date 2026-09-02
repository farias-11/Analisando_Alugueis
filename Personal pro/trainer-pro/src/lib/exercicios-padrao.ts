// Biblioteca padrão (handoff, seção 4 — Biblioteca): conjunto inicial de
// exercícios comuns pra não começar do zero. Sem vídeo — o app não tem um
// link de YouTube de verdade pra cada um, e inventar um quebraria na hora
// de assistir. O personal complementa com o próprio vídeo depois, se quiser
// (a biblioteca não tem edição ainda; dá pra excluir e recriar com mídia).
export const EXERCICIOS_PADRAO: { nome: string; grupoMuscular: string; instrucoes: string }[] = [
  // Pernas
  { nome: "Agachamento livre", grupoMuscular: "Pernas", instrucoes: "Pés na largura dos ombros, desça controlando o joelho alinhado com o pé, quadril para trás." },
  { nome: "Leg Press 45°", grupoMuscular: "Pernas", instrucoes: "Pés na largura dos ombros na plataforma, desça até 90° de joelho sem tirar o quadril do encosto." },
  { nome: "Cadeira extensora", grupoMuscular: "Pernas", instrucoes: "Estenda o joelho até quase a extensão total, controle a volta sem soltar o peso." },
  { nome: "Cadeira flexora", grupoMuscular: "Pernas", instrucoes: "Flexione o joelho trazendo o calcanhar em direção ao glúteo, controle a volta." },
  { nome: "Afundo", grupoMuscular: "Pernas", instrucoes: "Passo à frente, desça o joelho de trás quase até o chão, tronco ereto." },
  { nome: "Cadeira adutora", grupoMuscular: "Pernas", instrucoes: "Feche as pernas contra a resistência, controle a volta." },
  { nome: "Cadeira abdutora", grupoMuscular: "Pernas", instrucoes: "Abra as pernas contra a resistência, controle a volta." },
  { nome: "Panturrilha em pé", grupoMuscular: "Pernas", instrucoes: "Suba na ponta dos pés o máximo possível, desça até alongar bem a panturrilha." },
  { nome: "Stiff", grupoMuscular: "Pernas", instrucoes: "Desça a barra rente às pernas mantendo a coluna neutra, sentindo o alongamento no posterior." },
  { nome: "Agachamento búlgaro", grupoMuscular: "Pernas", instrucoes: "Pé de trás apoiado num banco, desça o joelho da frente controlando o equilíbrio." },

  // Glúteos
  { nome: "Elevação pélvica", grupoMuscular: "Glúteos", instrucoes: "Costas apoiadas num banco, suba o quadril contraindo o glúteo no topo." },
  { nome: "Glúteo na polia (coice)", grupoMuscular: "Glúteos", instrucoes: "Empurre a perna para trás contraindo o glúteo, sem arquear a lombar." },
  { nome: "Abdução de quadril no cabo", grupoMuscular: "Glúteos", instrucoes: "Afaste a perna lateralmente contra a resistência, tronco estável." },
  { nome: "Cadeira flexora unilateral", grupoMuscular: "Glúteos", instrucoes: "Flexione uma perna de cada vez, foco na contração do glúteo/posterior." },

  // Costas
  { nome: "Puxada frente", grupoMuscular: "Costas", instrucoes: "Puxe a barra até a altura do queixo/peito, cotovelos apontando para baixo." },
  { nome: "Remada curvada", grupoMuscular: "Costas", instrucoes: "Tronco inclinado à frente, puxe a barra até o abdômen, cotovelos próximos ao corpo." },
  { nome: "Remada baixa (cabo)", grupoMuscular: "Costas", instrucoes: "Puxe o cabo até o abdômen mantendo o tronco ereto, sem balançar." },
  { nome: "Puxada com triângulo", grupoMuscular: "Costas", instrucoes: "Puxe o triângulo até o peito, cotovelos para trás." },
  { nome: "Barra fixa (ou puxada assistida)", grupoMuscular: "Costas", instrucoes: "Puxe o corpo até o queixo passar da barra, controle a descida." },
  { nome: "Pull-over", grupoMuscular: "Costas", instrucoes: "Leve o peso por trás da cabeça mantendo os cotovelos levemente flexionados." },
  { nome: "Remada unilateral (serrote)", grupoMuscular: "Costas", instrucoes: "Apoio de joelho e mão no banco, puxe o halter até a altura do quadril." },

  // Peito
  { nome: "Supino reto", grupoMuscular: "Peito", instrucoes: "Desça a barra até o peito controlando, empurre sem travar totalmente o cotovelo." },
  { nome: "Supino inclinado", grupoMuscular: "Peito", instrucoes: "Mesmo movimento do supino reto, banco inclinado para focar a porção superior do peito." },
  { nome: "Crucifixo reto", grupoMuscular: "Peito", instrucoes: "Abra os braços com cotovelos levemente flexionados, sentindo o alongamento no peito." },
  { nome: "Crossover (cabo)", grupoMuscular: "Peito", instrucoes: "Traga os cabos à frente do corpo cruzando levemente, contraindo o peito." },
  { nome: "Flexão de braço", grupoMuscular: "Peito", instrucoes: "Corpo alinhado, desça até quase tocar o chão, empurre de volta." },
  { nome: "Peck deck (voador)", grupoMuscular: "Peito", instrucoes: "Aproxime os braços à frente do corpo contraindo o peito, controle a volta." },

  // Ombros
  { nome: "Desenvolvimento com halteres", grupoMuscular: "Ombros", instrucoes: "Empurre os halteres para cima até quase estender o cotovelo, sem arquear a lombar." },
  { nome: "Elevação lateral", grupoMuscular: "Ombros", instrucoes: "Eleve os halteres lateralmente até a altura do ombro, cotovelos levemente flexionados." },
  { nome: "Elevação frontal", grupoMuscular: "Ombros", instrucoes: "Eleve o halter à frente até a altura do ombro, controle a descida." },
  { nome: "Remada alta", grupoMuscular: "Ombros", instrucoes: "Puxe a barra rente ao corpo até a altura do peito, cotovelos acima das mãos." },
  { nome: "Crucifixo invertido", grupoMuscular: "Ombros", instrucoes: "Tronco inclinado à frente, abra os braços contraindo a parte posterior do ombro." },

  // Braços
  { nome: "Rosca direta", grupoMuscular: "Braços", instrucoes: "Flexione o cotovelo sem balançar o tronco, controle a descida." },
  { nome: "Rosca alternada", grupoMuscular: "Braços", instrucoes: "Flexione um braço de cada vez, cotovelo fixo ao lado do corpo." },
  { nome: "Rosca martelo", grupoMuscular: "Braços", instrucoes: "Mesmo movimento da rosca direta, pegada neutra (palmas viradas uma para a outra)." },
  { nome: "Tríceps corda (polia)", grupoMuscular: "Braços", instrucoes: "Estenda o cotovelo empurrando a corda para baixo, abrindo levemente no final." },
  { nome: "Tríceps testa", grupoMuscular: "Braços", instrucoes: "Deitado, desça a barra em direção à testa flexionando só o cotovelo." },
  { nome: "Tríceps francês", grupoMuscular: "Braços", instrucoes: "Halter atrás da cabeça, estenda o cotovelo mantendo o braço fixo." },
  { nome: "Mergulho no banco", grupoMuscular: "Braços", instrucoes: "Mãos apoiadas no banco atrás do corpo, desça flexionando o cotovelo e empurre de volta." },

  // Abdômen
  { nome: "Abdominal supra", grupoMuscular: "Abdômen", instrucoes: "Flexione o tronco em direção ao quadril sem puxar o pescoço com as mãos." },
  { nome: "Prancha", grupoMuscular: "Abdômen", instrucoes: "Corpo alinhado apoiado nos antebraços e pontas dos pés, contraia o abdômen mantendo a posição." },
  { nome: "Elevação de pernas", grupoMuscular: "Abdômen", instrucoes: "Suspenso ou deitado, eleve as pernas controlando, sem balançar o corpo." },
  { nome: "Abdominal oblíquo", grupoMuscular: "Abdômen", instrucoes: "Gire o tronco levando o cotovelo em direção ao joelho oposto." },

  // Full Body
  { nome: "Esteira (caminhada/corrida)", grupoMuscular: "Full Body", instrucoes: "Ajuste velocidade e inclinação conforme o objetivo de intensidade do dia." },
  { nome: "Bike ergométrica", grupoMuscular: "Full Body", instrucoes: "Ajuste a resistência conforme o objetivo de intensidade do dia." },
  { nome: "Burpee", grupoMuscular: "Full Body", instrucoes: "Agache, jogue as pernas para trás em prancha, volte e salte esticando o corpo." },
  { nome: "Kettlebell swing", grupoMuscular: "Full Body", instrucoes: "Movimento de quadril (não de braço) projetando o peso à altura do peito." },
];
