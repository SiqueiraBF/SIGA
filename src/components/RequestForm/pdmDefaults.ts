import { PdmCategoria, PdmGrupoTipo, PdmAbreviacao } from '../../types';

export const DEFAULT_CATEGORIAS: PdmCategoria[] = [
  {
    id: 'ABRACADEIRAS',
    nome: 'Abracadeiras',
    descricao: 'Abracadeiras. Atributos sugeridos: Complemento (tipo), Diametro de amarração, Material de fabricação, Classe de normalização, Nome comerc./Linha/Marca, Fabricante, Referencia',
    estrutura_linear: 'ABRACADEIRAS [COMPLEMENTO (TIPO)] [DIAMETRO DE AMARRAÇÃO] [MATERIAL DE FABRICAÇÃO] [CLASSE DE NORMALIZAÇÃO] [NOME COMERC./LINHA/MARCA] [FABRICANTE] [REFERENCIA]',
    diretrizes: [
      '1. Nomenclatura curta: ABRACADEIRA.',
      '2. Obrigatório: Complemento (tipo), Diametro de amarração, Material de fabricação, Classe de normalização e outros atributos se aplicável.'
    ],
    exemplos: [
      'ABRACAD U 3/4P AG SAE1020',
      'ABRACAD BOSCH F000600243'
    ]
  },
  {
    id: 'CAMARA_DE_AR',
    nome: 'Camara de Ar',
    descricao: 'Camara de Ar. Atributos sugeridos: Dimensões, Modelo valvula, Fabricante, Referencia',
    estrutura_linear: 'CAMARA DE AR [DIMENSÕES] [MODELO VALVULA] [FABRICANTE] [REFERENCIA]',
    diretrizes: [
      '1. Nomenclatura curta: CAMARA DE AR.',
      '2. Obrigatório: Dimensões, Modelo valvula, Fabricante, Referencia.'
    ],
    exemplos: [
      'CAMARA AR 12.4 R36 AT2036',
      'CAMARA AR JUMIL 9601027'
    ]
  },
  {
    id: 'PORCA',
    nome: 'Porca',
    descricao: 'Porca. Atributos sugeridos: Complemento (tipo), ??? (SIST. TRAVA), Bitola, Tipo de Rosca, Material de fabricação, Acabamento, Fabricante, Referencia/Norma',
    estrutura_linear: 'PORCA [COMPLEMENTO (TIPO)] [??? (SIST. TRAVA)] [BITOLA] [TIPO DE ROSCA] [MATERIAL DE FABRICAÇÃO] [ACABAMENTO] [FABRICANTE] [REFERENCIA/NORMA]',
    diretrizes: [
      '1. Nomenclatura curta: PORCA.',
      '2. Obrigatório: Complemento (tipo), ??? (SIST. TRAVA), Bitola, Tipo de Rosca e outros atributos se aplicável.'
    ],
    exemplos: [
      'PORCA SEXT 5/32P UNC AG',
      'PORCA SEG J DEERE L116259'
    ]
  },
  {
    id: 'ALIMENTOS',
    nome: 'Alimentos',
    descricao: 'Alimentos. Atributos sugeridos: Complemento (tipo), Fabricante/Marca, Obs.: A unidade de medida deve ser sempre KG ou L., ARROZ TIPO 1, CHA ERVA DOCE, CARNE FRANGO ASA, BISCOITO AGUA E SAL AMANTEIGADO, BISCOITO COCO',
    estrutura_linear: 'ALIMENTOS [COMPLEMENTO (TIPO)] [FABRICANTE/MARCA] [OBS.: A UNIDADE DE MEDIDA DEVE SER SEMPRE KG OU L.] [ARROZ TIPO 1] [CHA ERVA DOCE] [CARNE FRANGO ASA] [BISCOITO AGUA E SAL AMANTEIGADO] [BISCOITO COCO]',
    diretrizes: [
      '1. Nomenclatura curta: ARROZ.',
      '2. Obrigatório: Complemento (tipo), Fabricante/Marca, Obs.: A unidade de medida deve ser sempre KG ou L., ARROZ TIPO 1 e outros atributos se aplicável.'
    ],
    exemplos: []
  },
  {
    id: 'CORREIA_TRANSPORTADORA',
    nome: 'Correia transportadora',
    descricao: 'Correia transportadora. Atributos sugeridos: Aplicação/Tipo, Número de lonas, Espessura da cobertura superior, Espessura da cobertura inferior, Largura da correia, Fabricante, Referencia/Modelo, Obs.: A informação da espessura das coberturas não se aplica a correias laminadas',
    estrutura_linear: 'CORREIA TRANSPORTADORA [APLICAÇÃO/TIPO] [NÚMERO DE LONAS] [ESPESSURA DA COBERTURA SUPERIOR] [ESPESSURA DA COBERTURA INFERIOR] [LARGURA DA CORREIA] [FABRICANTE] [REFERENCIA/MODELO] [OBS.: A INFORMAÇÃO DA ESPESSURA DAS COBERTURAS NÃO SE APLICA A CORREIAS LAMINADAS]',
    diretrizes: [
      '1. Nomenclatura curta: CORREIA TRANSPORTADORA.',
      '2. Obrigatório: Aplicação/Tipo, Número de lonas, Espessura da cobertura superior, Espessura da cobertura inferior e outros atributos se aplicável.'
    ],
    exemplos: [
      'CORREIA ACH AE AO 4L 72P MERCURIO PN2200',
      'CORREIA LAM ACH AE 4L 15P KAUTHEC KTCL3',
      'CORREIA TG 1/8X1/8X13P MERCURIO 5PN2200'
    ]
  },
  {
    id: 'MADEIRAS',
    nome: 'Madeiras',
    descricao: 'Madeiras. Atributos sugeridos: Espessura/Diametro, Largura, Comprimento, Tipo da madeira',
    estrutura_linear: 'MADEIRAS [ESPESSURA/DIAMETRO] [LARGURA] [COMPRIMENTO] [TIPO DA MADEIRA]',
    diretrizes: [
      '1. Nomenclatura curta: TABUA.',
      '2. Obrigatório: Espessura/Diametro, Largura, Comprimento, Tipo da madeira.'
    ],
    exemplos: [
      'TABUA MAD 20X250X5000MM',
      'CAIBRO MAD 50X55X400MM',
      'BEIRAL MAD 250X4000MM',
      'CHAPA MAD COMP 15X1100X1900MM',
      'CHAPA MADEIRITE RESIN 10X110X220MM'
    ]
  },
  {
    id: 'LUBRIFICANTE',
    nome: 'Lubrificante',
    descricao: 'Lubrificante. Atributos sugeridos: Característica, Nome Comercial, Fabricante/Marca, Referencia',
    estrutura_linear: 'LUBRIFICANTE [CARACTERÍSTICA] [NOME COMERCIAL] [FABRICANTE/MARCA] [REFERENCIA]',
    diretrizes: [
      '1. Nomenclatura curta: OLEO LUBR.',
      '2. Obrigatório: Característica, Nome Comercial, Fabricante/Marca, Referencia.'
    ],
    exemplos: [
      'OLEO LUBR 15W40 PLUS 50 JD 132456'
    ]
  },
  {
    id: 'ANEIS',
    nome: 'Aneis',
    descricao: 'Aneis. Atributos sugeridos: Complemento (tipo), Dimensões (Diâm. Interno), Dimensões (Diâm. Externo), Material de fabricação, Classe de normalização, Fabricante, Referencia',
    estrutura_linear: 'ANEIS [COMPLEMENTO (TIPO)] [DIMENSÕES (DIÂM. INTERNO)] [DIMENSÕES (DIÂM. EXTERNO)] [MATERIAL DE FABRICAÇÃO] [CLASSE DE NORMALIZAÇÃO] [FABRICANTE] [REFERENCIA]',
    diretrizes: [
      '1. Nomenclatura curta: ANEL.',
      '2. Obrigatório: Complemento (tipo), Dimensões (Diâm. Interno), Dimensões (Diâm. Externo), Material de fabricação e outros atributos se aplicável.'
    ],
    exemplos: [
      'ANEL AJUSTE 1.5X35MM AC SAE1020',
      'ANEL ELAST CASE 10311200'
    ]
  },
  {
    id: 'PARAFUSOS',
    nome: 'Parafusos',
    descricao: 'Parafusos. Atributos sugeridos: Tipo da Cabeça, Complemento (tipo), Bitola, Comprimento, Tipo de Rosca, Material de fabricação, Acabamento, Torque, Fabricante, Referencia/Norma',
    estrutura_linear: 'PARAFUSOS [TIPO DA CABEÇA] [COMPLEMENTO (TIPO)] [BITOLA] [COMPRIMENTO] [TIPO DE ROSCA] [MATERIAL DE FABRICAÇÃO] [ACABAMENTO] [TORQUE] [FABRICANTE] [REFERENCIA/NORMA]',
    diretrizes: [
      '1. Nomenclatura curta: PARAF.',
      '2. Obrigatório: Tipo da Cabeça, Complemento (tipo), Bitola, Comprimento e outros atributos se aplicável.'
    ],
    exemplos: [
      'PARAF ALLEN C CAB 12X35MM UNC AC BICR',
      'PARAF CAB FRANC 12X40MM CNH 380530'
    ]
  },
  {
    id: 'ROLAMENTOS',
    nome: 'Rolamentos',
    descricao: 'Rolamentos. Atributos sugeridos: Complemento (tipo), Blindagem, Referencia, Fabricante',
    estrutura_linear: 'ROLAMENTOS [COMPLEMENTO (TIPO)] [BLINDAGEM] [REFERENCIA] [FABRICANTE]',
    diretrizes: [
      '1. Nomenclatura curta: ROLAMENTO.',
      '2. Obrigatório: Complemento (tipo), Blindagem, Referencia, Fabricante.'
    ],
    exemplos: [
      'ROL AUTOCOMP ROLO CILIN 21306CC SKF',
      'ROL ROLO F CILIN 22207E SKF'
    ]
  },
  {
    id: 'FILTROS',
    nome: 'Filtros',
    descricao: 'Filtros. Atributos sugeridos: Aplicação, Fabricante, Referencia, Obs.: Para os cadastros antigos, de aplicação em veículo ou implemento agrícola, não há a necessidade de bloqueá-lo por falta de informação (aplicação), somente para os cadastros novos é obrigatória a informação da aplicação do filtro.',
    estrutura_linear: 'FILTROS [APLICAÇÃO] [FABRICANTE] [REFERENCIA] [OBS.: PARA OS CADASTROS ANTIGOS, DE APLICAÇÃO EM VEÍCULO OU IMPLEMENTO AGRÍCOLA, NÃO HÁ A NECESSIDADE DE BLOQUEÁ-LO POR FALTA DE INFORMAÇÃO (APLICAÇÃO), SOMENTE PARA OS CADASTROS NOVOS É OBRIGATÓRIA A INFORMAÇÃO DA APLICAÇÃO DO FILTRO.]',
    diretrizes: [
      '1. Nomenclatura curta: FILTRO.',
      '2. Obrigatório: Aplicação, Fabricante, Referencia, Obs.: Para os cadastros antigos, de aplicação em veículo ou implemento agrícola, não há a necessidade de bloqueá-lo por falta de informação (aplicação), somente para os cadastros novos é obrigatória a informação da aplicação do filtro..'
    ],
    exemplos: [
      'FILTRO AGUA MONTANA 71000970',
      'FILTRO AR J DEERE AL177184',
      'FILTRO COMB J DEERE CAV296',
      'FILTRO HIDR J DEERE AE43494',
      'FILTRO LUBR J DEERE RE57394'
    ]
  },
  {
    id: 'FORMULARIOS',
    nome: 'Formulários',
    descricao: 'Formulários. Atributos sugeridos: Aplicação/Tipo, Largura da página, Comprimento da página, Número de vias, Número de páginas',
    estrutura_linear: 'FORMULÁRIOS [APLICAÇÃO/TIPO] [LARGURA DA PÁGINA] [COMPRIMENTO DA PÁGINA] [NÚMERO DE VIAS] [NÚMERO DE PÁGINAS]',
    diretrizes: [
      '1. Nomenclatura curta: FORMULARIO.',
      '2. Obrigatório: Aplicação/Tipo, Largura da página, Comprimento da página, Número de vias e outros atributos se aplicável.'
    ],
    exemplos: [
      'FORM CONT 40X280MM 2V 5000FL',
      'FORM CLASSICACAO SOJA 130X210MM 3V 100FL'
    ]
  },
  {
    id: 'FIOS_CABOS_ELETRICOS',
    nome: 'Fios/Cabos Elétricos',
    descricao: 'Fios/Cabos Elétricos. Atributos sugeridos: Marca/Fabricante, Material condutor, Revestimento/Isolação, Encordoamento, Número de vias, Seção nominal, Tensão suportada, Classe de temperatura, Cor',
    estrutura_linear: 'FIOS/CABOS ELÉTRICOS [MARCA/FABRICANTE] [MATERIAL CONDUTOR] [REVESTIMENTO/ISOLAÇÃO] [ENCORDOAMENTO] [NÚMERO DE VIAS] [SEÇÃO NOMINAL] [TENSÃO SUPORTADA] [CLASSE DE TEMPERATURA] [COR]',
    diretrizes: [
      '1. Nomenclatura curta: CABO.',
      '2. Obrigatório: Marca/Fabricante, Material condutor, Revestimento/Isolação, Encordoamento e outros atributos se aplicável.'
    ],
    exemplos: [
      'CABO COBRE PP FLEX 4X16MM2 1KV 90G',
      'CABO AFUMEX PRYSMIAN 10MM2 BRA 750V',
      'FIO COBRE PVC 1.5MM2 750V 70G',
      'FIO COBRE NU ESM PEI 29AWG 200G',
      'FIO ALUM ESM PEI27AWG 180G'
    ]
  },
  {
    id: 'COMBUSTIVEL',
    nome: 'Combustível',
    descricao: 'Combustível. Atributos sugeridos: Característica',
    estrutura_linear: 'COMBUSTÍVEL [CARACTERÍSTICA]',
    diretrizes: [
      '1. Nomenclatura curta: OLEO EXTRA DIESEL.',
      '2. Obrigatório: Característica.'
    ],
    exemplos: [
      'OLEO EXTRA DIESEL B S500'
    ]
  },
  {
    id: 'ARRUELA',
    nome: 'Arruela',
    descricao: 'Arruela. Atributos sugeridos: Complemento (tipo), Dimensões, Material de fabricação, Acabamento, Fabricante, Referencia/Norma, Largura do pneu, Perfil, Construção, Aro, Nº de lonas, Indicador de carga maxima, Indicador de velocidade maxima, Fabricante, Desenho',
    estrutura_linear: 'ARRUELA [COMPLEMENTO (TIPO)] [DIMENSÕES] [MATERIAL DE FABRICAÇÃO] [ACABAMENTO] [FABRICANTE] [REFERENCIA/NORMA] [LARGURA DO PNEU] [PERFIL] [CONSTRUÇÃO] [ARO] [Nº DE LONAS] [INDICADOR DE CARGA MAXIMA] [INDICADOR DE VELOCIDADE MAXIMA] [FABRICANTE] [DESENHO]',
    diretrizes: [
      '1. Nomenclatura curta: PNEU.',
      '2. Obrigatório: Complemento (tipo), Dimensões, Material de fabricação, Acabamento e outros atributos se aplicável.'
    ],
    exemplos: [
      'ARRUELA PRESS 3/8P AC BICR',
      'ARRUELA AC WARTSILA PAAC000685',
      'Pneu',
      'PNEU 10.00 R20 6L 147K MICHELIN FORCE XZY3',
      'PNEU 175 70 R14 2L 88T MICHELIN ENERGY XM2'
    ]
  },
  {
    id: 'CHAPAS',
    nome: 'Chapas',
    descricao: 'Chapas. Atributos sugeridos: Complemento (tipo), Espessura da chapa, Diâmetro ou Largura e, Comprimento do furo, Largura da chapa, Comprimento da chapa, Material de fabricação, Normalização, Fabricante, Referencia, *Obs.: - As medidas devem ser sempre informadas em ordem crescente, portanto pode-se informar primeiramente a espessura ou o diâmetro do furo. - As dimensões devem ser bem detalahdas no texto dados básicos do material.',
    estrutura_linear: 'CHAPAS [COMPLEMENTO (TIPO)] [ESPESSURA DA CHAPA] [DIÂMETRO OU LARGURA E] [COMPRIMENTO DO FURO] [LARGURA DA CHAPA] [COMPRIMENTO DA CHAPA] [MATERIAL DE FABRICAÇÃO] [NORMALIZAÇÃO] [FABRICANTE] [REFERENCIA] [*OBS.: - AS MEDIDAS DEVEM SER SEMPRE INFORMADAS EM ORDEM CRESCENTE, PORTANTO PODE-SE INFORMAR PRIMEIRAMENTE A ESPESSURA OU O DIÂMETRO DO FURO. - AS DIMENSÕES DEVEM SER BEM DETALAHDAS NO TEXTO DADOS BÁSICOS DO MATERIAL.]',
    diretrizes: [
      '1. Nomenclatura curta: CHAPA.',
      '2. Obrigatório: Complemento (tipo), Espessura da chapa, Diâmetro ou Largura e, Comprimento do furo e outros atributos se aplicável.'
    ],
    exemplos: [
      'CHAPA PERF 3X6X1000X3000MM AC SAE1020',
      'CHAPA EXP 4X5X6X1000X3000MM AC SAE1020',
      'CHAPA XADR 6X1000X3000MM AC SAE 1020',
      'CHAPA LISA 6X1000X3000MM AC SAE 1020'
    ]
  },
  {
    id: 'CORREIA_TRANSMISSAO',
    nome: 'Correia transmissão',
    descricao: 'Correia transmissão. Atributos sugeridos: Tipo, Perfil (Para correias V), Modelo (Para correias V), Fabricante, Referencia, Obs.: Para as correias V, a referencia não é uma informação obrigatória, porém o perfil deve ser informado.',
    estrutura_linear: 'CORREIA TRANSMISSÃO [TIPO] [PERFIL (PARA CORREIAS V)] [MODELO (PARA CORREIAS V)] [FABRICANTE] [REFERENCIA] [OBS.: PARA AS CORREIAS V, A REFERENCIA NÃO É UMA INFORMAÇÃO OBRIGATÓRIA, PORÉM O PERFIL DEVE SER INFORMADO.]',
    diretrizes: [
      '1. Nomenclatura curta: CORREIA.',
      '2. Obrigatório: Tipo, Perfil (Para correias V), Modelo (Para correias V), Fabricante e outros atributos se aplicável.'
    ],
    exemplos: [
      'CORREIA DENT GATES 40707X20XS',
      'CORREIA V B86 GOODYEAR'
    ]
  },
  {
    id: 'VIDROS',
    nome: 'Vidros',
    descricao: 'Vidros. Atributos sugeridos: Espessura, Tipo',
    estrutura_linear: 'VIDROS [ESPESSURA] [TIPO]',
    diretrizes: [
      '1. Nomenclatura curta: VIDRO.',
      '2. Obrigatório: Espessura, Tipo.'
    ],
    exemplos: [
      'VIDRO 3MM FANTASIA CANELADO',
      'VIDRO 10MM TEMPERADO',
      'VIDRO 6MM LAM'
    ]
  },
  {
    id: 'CARTUCHO_IMPRESSORA',
    nome: 'Cartucho impressora',
    descricao: 'Cartucho impressora. Atributos sugeridos: Aplicação, Modelo/Número, Fabricante, Referencia, Cor',
    estrutura_linear: 'CARTUCHO IMPRESSORA [APLICAÇÃO] [MODELO/NÚMERO] [FABRICANTE] [REFERENCIA] [COR]',
    diretrizes: [
      '1. Nomenclatura curta: CARTUCHO.',
      '2. Obrigatório: Aplicação, Modelo/Número, Fabricante, Referencia e outros atributos se aplicável.'
    ],
    exemplos: [
      'CARTUCHO IMPRESS 11 HP C4586 CIANO',
      'CARTUCHO IMPRESS 117 EPSON T117120',
      'CARTUCHO IMPRESS 27 LEXMARK 10N0227 COL'
    ]
  },
  {
    id: 'GRAXA',
    nome: 'Graxa',
    descricao: 'Graxa. Atributos sugeridos: Grau de consistência, Nome Comercial, Fabricante/Marca, Referencia',
    estrutura_linear: 'GRAXA [GRAU DE CONSISTÊNCIA] [NOME COMERCIAL] [FABRICANTE/MARCA] [REFERENCIA]',
    diretrizes: [
      '1. Nomenclatura curta: GRAXA.',
      '2. Obrigatório: Grau de consistência, Nome Comercial, Fabricante/Marca, Referencia.'
    ],
    exemplos: [
      'GRAXA NLGI1 MAXLUB BARDAHL 123456'
    ]
  },
  {
    id: 'ENGATES_RAPIDOS_MANGUEIRAS',
    nome: 'Engates Rápidos e Conexões para Mangueiras',
    descricao: 'Engates rápidos (Camlock, garra, pneumáticos), espigões, emendas e conectores de baixa/média pressão para mangueiras e condução de fluidos.',
    estrutura_linear: '[PRODUTO] [TIPO_CONEXAO] [MEDIDA_UNIFICADA] [MATERIAL] {REFERENCIA} {FABRICANTE}',
    diretrizes: [
      '1. Nomenclatura curta obrigatória para produto: ENGAT RAP para engate rápido, ESPIGAO para espigão escama, EMENDA para emendas lineares, NIPLE para niples comuns.',
      '2. REGRA CONDICIONAL DE ENTRADA: Identifique se o texto bruto refere-se a um "Item de Marca Completo" ou a um "Item Genérico".',
      '3. CASO 1 - ITEM DE MARCA COMPLETO: Se forem detectados [FABRICANTE] E [REFERENCIA], a IA deve aprovar o cadastro imediatamente (Status: Aprovado) e priorizar a marca no final.',
      '4. CASO 2 - ITEM GENÉRICO: Se NÃO houver fabricante e referência de catálogo no texto bruto, o cadastro é APROVADO se contiver [PRODUTO], [TIPO_CONEXAO], [MEDIDA_UNIFICADA] e [MATERIAL]. NÃO exija fabricante ou referência para itens genéricos.',
      '5. CASO 3 - ITEM DE MARCA INCOMPLETO (TRAVA DE SEGURANÇA): Se o texto bruto citar apenas uma marca industrial sem especificar nenhuma medida ou padrão, altere o status para "FALTANDO_INFO".',
      '6. PADRONIZAÇÃO DE TIPO_CONEXAO: Identifique se é macho/fêmea e o tipo de rosca/engate (Ex: MACH R EXT para macho rosca externa, FEM R INT para fêmea rosca interna, MACH ESCAMA para espigão escama macho).',
      '7. MEDIDA UNIFICADA: Formate medidas em polegadas com a letra "P" colada ao número (Ex: 3P, 2P, 1/2P). Se houver bitola de mangueira e rosca combinadas, separe-as por "X" (Ex: 1/2X1/2NPT).',
      '8. MATERIAL OBRIGATÓRIO: Identifique o material da peça (Ex: ALUM, LAT, AI, AC, PP, NYLON). O material pode vir em qualquer ordem no texto bruto. Se omitido em item genérico, mude o status para "FALTANDO_INFO".',
      '9. POSICIONAMENTO DE MARCA: O campo {FABRICANTE} deve ser posicionado como a última palavra da string final.'
    ],
    exemplos: [
      'ENGATE RAPIDO MACHO ALUMINIO ROSCA EXTERNA 3" -> ENGAT RAP MACH R EXT 3P ALUM',
      'ENGATE RAPIDO FEMEA ALUMINIO ROSCA EXTERNA 3" -> ENGAT RAP FEM R EXT 3P ALUM',
      'ENGATE RAPIDO MACHO ALUMINIO ROSCA INTERNA 2" -> ENGAT RAP MACH R INT 2P ALUM',
      'ESPIGAO DE LATAO COM ROSCA MACHO 1/2 NPT PARA MANGUEIRA 1/2 -> ESPIGAO MACH 1/2X1/2NPT LAT',
      'EMENDA DE ALUMINIO PARA MANGUEIRA DE 3/4 -> EMENDA 3/4P ALUM'
    ]
  }
];

export const DEFAULT_GRUPOS: PdmGrupoTipo[] = [
  {
    id: 'MAT__AUX___DE_CONSUMO__MATERIAL_DE_USO_E_CONSUMO_',
    titulo: 'Mat. Aux./ de Consumo (Material de uso e consumo)',
    descricao: 'Utilizar para materiais cujo consumo não decorra do processo de produção/industrialização. Não sendo necessário à obtenção do produto final. Materiais de bens duráveis e não duráveis.',
    exemplos: [
      'PARAF ALLEN C CAB 10X20MM R UNC AC 8.8',
      'PAPEL A4 210X297MM 500FL',
      'ROL AUTO COMP ROLO CILIN 22317 SKF',
      'COPO DESC 180ML 100UN PS'
    ]
  },
  {
    id: 'MATERIAIS_IMPORTACAO',
    titulo: 'Materiais Importação',
    descricao: 'Utilizar na aquisição de materiais importados, que necessitem de descrição em outros idiomas.',
    exemplos: [
      'GOVERNOR W6L20 WARTSILA PAAE227551',
      'BALL BEARING WESTFALIA 00116012680',
      'LOWER HOUSING R ROYCE 5152300',
      'ORING WARTSILA 1260034'
    ]
  },
  {
    id: 'EQUIPAMENTOS_INFORMATICA',
    titulo: 'Equipamentos Informática',
    descricao: 'Utilizar nas aquisições de equipamentos eletrônicos que precisam de homologação da área de TI.',
    exemplos: [
      'IMPRESS MULTIF HP DESKJET1000',
      'IPHONE 16 1TB APPLE',
      'COMP DESKTOP DELL OPTIPLEX 7010',
      'SOFTWARE OFFICE HOME AND BUSINESS 2013'
    ]
  },
  {
    id: 'ATIVO_IMOBILIZADO',
    titulo: 'Ativo Imobilizado',
    descricao: 'Utilizar nas compras de ativo imobilizado com valor maior que R$ 326,61 e vida útil superior a um ano.',
    exemplos: [
      'MESA 700X700X850MM AI',
      'ARMARIO 16PORT 1230X1980MM AC',
      'CAMINHONETE S10 LTZ DUPL FLEX 2.4',
      'TRATOR VALTRA BM120'
    ]
  },
  {
    id: 'MATERIAIS_DE_SSO',
    titulo: 'Materiais de SSO',
    descricao: 'Utilizar nas aquisições de EPI (Equipamento de Proteção Individual) e EPC (Equipamento de Proteção Coletiva).',
    exemplos: [
      'BOTA PVC BICOLOR ALPARGATA 786 N38',
      'CALCA DUPONT 3003PRO N40',
      'CAPACETE SEG BR MSA 101MJCA',
      'OCULOS LENTE INC UD SPERIAN S910'
    ]
  },
  {
    id: 'PRESTACOES_DE_SERVICO__MM01_',
    titulo: 'Prestações de Serviço (MM01)',
    descricao: 'Utilizar nas aquisição de material tipo serviço. Trata-se de serviços cadastrados como materiais devido à escrituração fiscal.',
    exemplos: [
      'FRETE ROD KG P GROSSA PR X CN PARECIS MT',
      'ENVELOPE SIMPL GAM 220X480MM 4X0 COUCHE',
      'PREST SERV GRAFICO',
      'ENVELOPE SACO FAM 260X360MM 4X0 COUCHE'
    ]
  },
  {
    id: 'MATERIAIS_RECUPERAVEIS',
    titulo: 'Materiais Recuperáveis',
    descricao: 'Utilizar nas contratações de serviços referente a recondicionamento e/ou recuperação de materiais.',
    exemplos: [
      'TURBINA 294041 REC',
      'ROTOR 12V 90A 20368 REC',
      'PNEU 215 75 R17.5 REC',
      'MOTOR HIDR 1031013010 REC'
    ]
  }
];

export const DEFAULT_ABREVIACOES: PdmAbreviacao[] = [
  { termo: 'ABASTECIMENTO', abreviacao: 'ABASTEC' },
  { termo: 'ABRACADEIRA', abreviacao: 'ABRAC' },
  { termo: 'ABSORVENTE', abreviacao: 'ABSORV' },
  { termo: 'ACABAMENTO', abreviacao: 'ACAB' },
  { termo: 'ACO CARBONO', abreviacao: 'AC' },
  { termo: 'ACO GALVANIZADO', abreviacao: 'AG' },
  { termo: 'ACO INOX', abreviacao: 'AI' },
  { termo: 'CABECA', abreviacao: 'CAB' },
  { termo: 'SEXTAVADO', abreviacao: 'SEXT' },
  { termo: 'SEXTAVADA', abreviacao: 'SEXT' },
  { termo: 'ENGATE', abreviacao: 'ENGAT' },
  { termo: 'EXTERNO', abreviacao: 'EXT' },
  { termo: 'EXTERNA', abreviacao: 'EXT' },
  { termo: 'INTERNO', abreviacao: 'INT' },
  { termo: 'INTERNA', abreviacao: 'INT' },
  { termo: 'GALVANIZADO', abreviacao: 'GALV' },
  { termo: 'COM', abreviacao: 'C' },
  { termo: 'SEM', abreviacao: 'S' },
  { termo: 'POLEGADA', abreviacao: 'P' },
  { termo: 'MILIMETROS', abreviacao: 'MM' },
  { termo: 'AMARELO', abreviacao: 'AMAR' },
  { termo: 'AZUL', abreviacao: 'AZU' },
  { termo: 'BRANCO', abreviacao: 'BR' },
  { termo: 'VERMELHO', abreviacao: 'VM' },
  { termo: 'VERDE', abreviacao: 'VD' },
  { termo: 'PRETO', abreviacao: 'PT' }
];
