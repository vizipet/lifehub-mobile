// Reformulações apenas dos textos demonstrativos originais. Bios editadas pelos médicos passam intactas.
const demoBios = new Map([
  [
    "Atendimento humanizado para prevenção, check-up e acompanhamento da saúde adulta.",
    "Atendimento em clínica médica com atenção ao cuidado humanizado, à prevenção, aos exames de rotina (check-up) e ao acompanhamento da saúde na vida adulta."
  ],
  [
    "Clínico geral com foco em doenças crônicas e saúde preventiva.",
    "Atendimento em clínica geral com foco na prevenção de doenças e no acompanhamento de pessoas com condições crônicas."
  ],
  [
    "Cardiologista. Avaliação de risco cardiovascular e hipertensão.",
    "Atendimento voltado à saúde do coração, com foco na avaliação do risco cardiovascular e no cuidado de pessoas com pressão alta (hipertensão)."
  ],
  [
    "Dermatologia clínica: acne, manchas e prevenção do câncer de pele.",
    "Atendimento em dermatologia clínica, com foco no cuidado de pessoas com acne e manchas na pele, além da prevenção do câncer de pele."
  ],
  [
    "Pediatra. Puericultura, vacinação e acompanhamento do crescimento.",
    "Atendimento pediátrico voltado ao cuidado preventivo da criança, à orientação sobre vacinação e ao acompanhamento do crescimento."
  ],
  [
    "Ortopedista. Dores na coluna, joelho e lesões esportivas.",
    "Atendimento em ortopedia com foco na avaliação de dores na coluna e nos joelhos, além de lesões relacionadas à prática de esportes."
  ],
  [
    "Psiquiatra. Ansiedade, depressão e qualidade do sono.",
    "Atendimento em psiquiatria com foco no cuidado da saúde mental, incluindo ansiedade, depressão e questões relacionadas à qualidade do sono."
  ],
  [
    "Geriatra. Cuidado integral da pessoa idosa e da família.",
    "Atendimento em geriatria voltado ao cuidado integral da pessoa idosa, considerando suas necessidades de saúde e o contexto familiar."
  ]
]);

export function professionalBio(bio) {
  return typeof bio === 'string' ? (demoBios.get(bio.trim()) || bio) : '';
}
