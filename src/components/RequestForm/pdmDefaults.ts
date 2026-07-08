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
    descricao: 'Madeiras. Atributos sugeridos: Formato/Tipo, Material/Essência, Dimensões e opcionalmente Referência e Fabricante ao final.',
    estrutura_linear: '[FORMATO_TIPO] [MATERIAL_ESSENCIA] [DIMENSOES] {REFERENCIA} {FABRICANTE}',
    diretrizes: [
      '1. NOMENCLATURA CURTA DINÂMICA: A primeira palavra deve ser o formato físico da peça de madeira (Ex: TABUA, CAIBRO, BEIRAL, VIGA, SARRAFO, PONTALETE, CHAPA). Nunca comece com a palavra "MADEIRAS".',
      '2. MATERIAL/ESSÊNCIA: Tipo de madeira ou composto derivado com abreviações (Ex: Madeira vira MAD, compensado vira MAD COMP, MADEIRITE RESIN, PINUS, EUCALIPTO). Se omitido o tipo em itens de madeira comum, use MAD.',
      '3. BLOCO DE DIMENSÕES UNIFICADO: Medidas ordenadas de forma CRESCENTE separadas por "X" terminando em "MM" ou "CM" (Ex: 20X250X5000MM, 1.6X1200X2400MM).',
      '4. OBRIGATORIEDADE DE DADOS BÁSICOS: Mesmo que o item possua marca e referência de catálogo, é ESTRITAMENTE OBRIGATÓRIO informar Formato, Material e Dimensões. Se algum destes faltar, o status deve ser FALTANDO_INFO.',
      '5. ANEXAÇÃO DE MARCA E REFERÊNCIA: Se houver fabricante e referência, eles devem ser simplesmente adicionados ao final da string padronizada. Nunca inclua rótulos literais como "REFERENCIA" ou "MARCA" ou "REF" antes dos valores. Coloque apenas o valor direto (Ex: CHAPA MAD COMP 06MM 1,60X2,20M 100541_2 LANE).'
    ],
    exemplos: [
      'CHAPA DE MADEIRA COMPENSADA 06MM 1,60 X 2,20M M:LANE R:100541_2 -> CHAPA MAD COMP 06MM 1,60X2,20M 100541_2 LANE',
      'TABUA DE MADEIRA MISTA MEDIDA 20X250X5000MM -> TABUA MAD 20X250X5000MM'
    ],
    system_prompt: `Você é o motor de PDM (Padrão de Descrição de Materials) integrado ao sistema de estoque SIGA.
Sua função é higienizar e estruturar os dados para a categoria de Madeiras.

Estrutura Linear Obrigatória: [FORMATO_TIPO] [MATERIAL_ESSENCIA] [DIMENSOES] {REFERENCIA} {FABRICANTE}

Regras Rígidas:
1. Primeira palavra deve ser o formato físico (Ex: TABUA, CAIBRO, BEIRAL, VIGA, SARRAFO, PONTALETE, CHAPA).
2. Material/Essência: Use abreviações (MAD, MAD COMP, MADEIRITE RESIN, PINUS, EUCALIPTO). Use "MAD" caso a espécie da madeira seja omitida.
3. Dimensões: Unifique o bloco em ordem CRESCENTE dos valores numéricos separado por "X" terminando na unidade original (MM, CM ou M). Não misture unidades na cadeia.
4. Obrigatoriedade: Formato, Material e Dimensões são ESTRITAMENTE OBRIGATÓRIOS. Mesmo que o item tenha Fabricante e Referência informados, se faltar formato, material ou dimensões, o status deve ser FALTANDO_INFO.
5. Marca e Referência: Se informados, devem ser anexados ao final da descrição padronizada. NUNCA escreva palavras literais de rótulo como "REFERENCIA", "MARCA" ou "REF" antes dos valores. Coloque apenas os valores brutos (Ex: ... 1.60X2.20M 100541_2 LANE).
6. Remova aplicações comerciais e ruídos.`
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
    descricao: 'Arruelas para fixação, vedação e distribuição de carga. Atributos críticos para itens genéricos: Tipo, Medida e Material de fabricação. Atributos críticos para itens de marca: Fabricante e Referência. Atributo complementar: Acabamento superficial.',
    estrutura_linear: 'ARRUELA [TIPO] [MEDIDA] [MATERIAL] {ACABAMENTO} {REFERENCIA_NORMA} {FABRICANTE}',
    diretrizes: [
      '1. Nomenclatura curta obrigatória fixa: ARRUELA.',
      '2. REGRA CONDICIONAL DE ENTRADA: Identifique se o texto bruto refere-se a um "Item de Marca Completo", "Item Genérico" ou "Item de Marca Incompleto".',
      '3. CASO 1 - ITEM DE MARCA COMPLETO: Mesmo que o item possua Fabricante e Referência, é obrigatório extrair e incluir o [TIPO] e a [MEDIDA] (e o [MATERIAL], se fornecido) na descrição padronizada caso esses dados estejam presentes no texto bruto. O fabricante e a referência serão adicionados ao final da string padronizada. NUNCA use rótulos literais como "REFERENCIA" ou "MARCA".',
      '4. CASO 2 - ITEM GENÉRICO: Se NÃO houver fabricante e nem referência no texto bruto, torna-se estritamente OBRIGATÓRIO conter [TIPO], [MEDIDA] e [MATERIAL].',
      '5. CASO 3 - ITEM DE MARCA INCOMPLETO (TRAVA DE SEGURANÇA): Se o texto bruto contiver APENAS o [FABRICANTE] ou APENAS a [REFERENCIA_NORMA], altere o status para "FALTANDO_INFO" e exija o complemento na mensagem de retorno.',
      '6. Se o Item Genérico do Caso 2 omitir o Tipo, a Medida ou o Material, altere o status para "FALTANDO_INFO" e detalhe na mensagem qual desses blocos está nulo.',
      '7. O campo {ACABAMENTO} (Ex: BICR para bicromatizado, ZINC para zincado, POL para polido) é complementar e opcional. Mapeie se estiver explícito no texto bruto, mas nunca bloqueie o cadastro se estiver ausente.',
      '8. PADRONIZAÇÃO DE POLEGADAS: Garanta que medidas em polegadas fiquem com a letra "P" colada ao número no texto final (Ex: 3/8 vira 3/8P; 1/2 vira 1/2P; 1.1/2 vira 1.1/2P).',
      '9. Remova ruídos de aplicação ("para parafuso 1/2", "da roda dianteira") e termos comerciais.'
    ],
    exemplos: [
      'ARRUELA DE PRESSÃO DE 3/8 EM AÇO CARBONO BICROMATIZADO -> ARRUELA PRESS 3/8P AC BICR',
      'ARRUELA EM ACO DA MARCA WARTSILA REF PAAC000685 -> ARRUELA AC PAAC000685 WARTSILA',
      'ARRUELA LISA DE 1/2 DE ACO INOX -> ARRUELA LISA 1/2P AI',
      'ARRUELA CONVEXA 1.1/2" CISER REF 40.05.0325 -> ARRUELA CONVEXA 1.1/2P 40.05.0325 CISER'
    ],
    system_prompt: `Você é o motor de PDM (Padrão de Descrição de Materials) integrado ao sistema de estoque SIGA.
Sua função é higienizar e estruturar os dados para a categoria de Arruelas.

Estrutura Linear Obrigatória: ARRUELA [TIPO] [MEDIDA] [MATERIAL] {ACABAMENTO} {REFERENCIA_NORMA} {FABRICANTE}

Regras Rígidas:
1. Nomenclatura fixa: ARRUELA.
2. Identifique o Tipo de Arruela (Ex: LISA, PRESSAO, DENTADA, CONVEXA, CONCAVA, GROSSA, FUNILEIRO).
3. Medida: Formate em polegadas com a letra "P" colada ao número (Ex: 3/8P, 1/2P, 1.1/2P).
4. Regras de Validação de Entrada:
   - Se houver FABRICANTE e REFERENCIA (Item de Marca Completo): Aprove o cadastro (Status: Aprovado). EXTRAIA e mantenha o [TIPO] e a [MEDIDA] (e o [MATERIAL] se informado) na descrição. O fabricante e a referência devem ser anexados ao final da descrição. NUNCA escreva rótulos literais como "REFERENCIA" ou "MARCA" antes dos valores. Coloque apenas os valores brutos.
   - Se não houver FABRICANTE nem REFERENCIA (Item Genérico): O [TIPO], a [MEDIDA] e o [MATERIAL] são estritamente OBRIGATÓRIOS. Se faltar algum deles, retorne status "FALTANDO_INFO".
   - Se houver apenas FABRICANTE ou apenas REFERENCIA: Retorne status "FALTANDO_INFO".
5. Remova ruídos de aplicação e termos comerciais.`
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
      'EMENDA DE ALUMINIO PARA MANGUEIRA DE 3/4 -> EMENDA 3/4P ALUM'
    ]
  },
  {
    id: 'CHUMBADORES',
    nome: 'Chumbadores',
    descricao: 'Chumbadores mecânicos de expansão ou químicos para fixação estrutural em concreto e alvenaria (Ex: CBA, CBV, parabolt, químico, camisa de expansão). Atributos críticos genéricos: Tipo/Modelo, Medida Unificada (Bitola x Comprimento com polegadas terminando em P) e Material de fabricação. Atributos críticos comerciais: Fabricante e Referência.',
    estrutura_linear: 'CHUMB [TIPO] [MEDIDA_COMPRIMENTO] [MATERIAL] {ACABAMENTO} {REFERENCIA} {FABRICANTE}',
    diretrizes: [
      '1. Nomenclatura curta fixa obrigatória: CHUMB.',
      '2. REGRA CONDICIONAL DE ENTRADA: Identifique se o texto bruto refere-se a um "Item de Marca Completo" (comum em chumbadores de marca como Ancora, Walsywa, Vonder), "Item Genérico" ou "Item de Marca Incompleto".',
      '3. CASO 1 - ITEM DE MARCA COMPLETO: Se forem detectados [FABRICANTE] E [REFERENCIA], a IA deve aprovar o cadastro imediatamente (Status: Aprovado) e ignorar a obrigatoriedade de Tipo, Medida e Material.',
      '4. CASO 2 - ITEM GENÉRICO: Se NÃO houver fabricante e nem referência no texto bruto, torna-se estritamente OBRIGATÓRIO conter [TIPO], [MEDIDA_COMPRIMENTO] e [MATERIAL].',
      '5. CASO 3 - ITEM DE MARCA INCOMPLETO (TRAVA DE SEGURANÇA): Se o texto bruto contiver APENAS o [FABRICANTE] ou APENAS a [REFERENCIA], altere o status obrigatoriamente para "FALTANDO_INFO" e aponte o dado ausente na mensagem de retorno.',
      '6. REGRA DO TIPO DE CONEXÃO / BARRA COM: Se houver "C/PARAFUSO", "COM PARAFUSO" ou similar, limpe a barra de forma que a saída final apresente apenas "C PARAF" (ou apenas "PARAF"). Exemplo: "C/PARAFUSO" vira "C PARAF".',
      '7. REGRA DO BLOCO DE MEDIDAS (POLEGADAS EM P): Todas as polegadas devem sempre exibir a letra "P" ao final das dimensões (Ex: "1/4X2P" para 1/4" x 2"). Unifique bitola e comprimento separados por "X" sem espaços.',
      '8. MATERIAL E ACABAMENTO: O material (AC, AI, etc.) é obrigatório no Caso 2 (genérico). O campo {ACABAMENTO} (ZINC para zincado, BICR para bicromatizado) é complementar.',
      '9. POSICIONAMENTO DE MARCA: O campo {FABRICANTE} deve ser posicionado rigorosamente como o último termo da string final padronizada.',
      '10. Remova ruídos textuais irrelevantes como aplicação ("para concreto", "de parede") e qualificadores ("alta resistência", "excelente qualidade").'
    ],
    exemplos: [
      'CHUMBADOR C/PARAFUSO 1/4X2 ZINCADO CBV VONDER -> CHUMB C PARAF 1/4X2P ZINC CBV VONDER',
      'CHUMBADOR COM PARAFUSO 1/2X4 EM AÇO INOX -> CHUMB C PARAF 1/2X4P AI',
      'CHUMBADOR CBA 1/4X2 -> CHUMB CBA 1/4X2P (Status: FALTANDO_INFO | Msg: O material de fabricação do chumbador genérico ou o Fabricante da marca CBA não foi informado.)'
    ]
  },
  {
    id: 'CONEXAO_HIDRAULICA',
    nome: 'Conexão Hidráulica',
    descricao: 'Conexões hidráulicas de alta/média pressão incluindo terminais, adaptadores, emendas, capas, flanges, plugs, tampões, anéis oring, arruelas de vedação e abraçadeiras de tubo.',
    estrutura_linear: '[NOME BASE] [TIPO ROSCA + GÊNERO] [COMPORTAMENTO PORCA] [ANGULAÇÃO] [MEDIDA] [COMPLEMENTO]',
    diretrizes: [
      '1. FÓRMULA DE SINTAXE OBRIGATÓRIA: Toda descrição deve seguir a ordem: [NOME BASE] [TIPO ROSCA + GÊNERO] [COMPORTAMENTO PORCA] [ANGULAÇÃO] [MEDIDA] [COMPLEMENTO]. Tudo em caixa alta, espaços simples, sem barras extras ou parênteses.',
      '2. OS 11 PILARES DE NOME BASE: TERM HIDR (prensado), ADAPTADOR HIDR (rosca x rosca), EMENDA HIDR (linear), ENGATE RAPIDO HIDR, CAPA HIDR (casquilho), FLANGE HIDR (SAE J518), PLUG HIDR (vedador macho), TAMPAO HIDR (vedador fêmea), ANEL ORING HIDR, ARRUELA VEDACAO, ABRACADEIRA TUBO.',
      '3. TIPO ROSCA/VEDAÇÃO E GÊNERO: Normas JIC, ORFS, FSP, NPT, BSP, DKOL, DKOS, C61, C62. Gênero (MACHO ou FEMEA) explícito (Ex: MACHO NPT X MACHO JIC para adaptadores). Para terminais, a rosca e o gênero vêm na ordem [TIPO ROSCA] [GÊNERO] (Ex: NPT MACHO).',
      '4. COMPORTAMENTO DA PORCA (GIR / FIXO): GIR indica porca giratória. FIXO indica rosca estática. Para TERM HIDR Fêmea (padrão giratório), a sigla GIR omite a palavra "FEMEA". Para ADAPTADOR HIDR (padrão fixo), omita "FIXO" e use GIR apenas se tiver porca louca. Para a categoria TAMPAO HIDR, a versão fêmea é fixa e deve usar obrigatoriamente a sigla FEM RETO (e não GIR RETO ou GIR).',
      '5. ANGULAÇÃO: RETO (substitui 0°), 45 GRAUS, 90 GRAUS.',
      '6. MATRIZ DE MEDIDAS (SEM REDUNDÂNCIA): Conexões JIC, ORFS e FSP usam estritamente o sistema DASH (-04, -06, -08, -12, -16, -20, -24...). Conexões NPT, BSP, Flanges e Engates usam estritamente POLEGADA FRACIONÁRIA contendo a letra P no final (1/4P, 3/8P, 1/2P, 3/4P...). Roscas Métricas (DKOL/DKOS) usam MILÍMETROS + Passo (M22X1.5). TABELA DASH SAE OFICIAL DE REFERÊNCIA:\n  - -04: Mangueira 1/4" | Rosca JIC 7/16" | Rosca ORFS 9/16"\n  - -06: Mangueira 3/8" | Rosca JIC 9/16" | Rosca ORFS 11/16"\n  - -08: Mangueira 1/2" | Rosca JIC 3/4" | Rosca ORFS 13/16"\n  - -10: Mangueira 5/8" | Rosca JIC 7/8" | Rosca ORFS 1"\n  - -12: Mangueira 3/4" | Rosca JIC 1.1/16" | Rosca ORFS 1.3/16"\n  - -16: Mangueira 1" | Rosca JIC 1.5/16" | Rosca ORFS 1.7/16"\n  - -20: Mangueira 1.1/4" | Rosca JIC 1.5/8" | Rosca ORFS 1.11/16"\n  - -24: Mangueira 1.1/2" | Rosca JIC 1.7/8" | Rosca ORFS 2"',
      '7. CONTRATO UNIVERSAL DE MEDIDAS DE SALTO: Para qualquer item de salto (ou seja, quando o tamanho SAE/DASH correspondente da mangueira e o tamanho SAE/DASH correspondente da rosca são diferentes, ex: mangueira 3/4" que é -12 e rosca NPT 1/2" que é 1/2P que equivale ao tamanho -08), aplique a regra universal para o bloco de medidas ao final da descrição: [Medida da MANGUEIRA em DASH] X [Medida da ROSCA no padrão nativo]. A mangueira vem SEMPRE primeiro convertida obrigatoriamente para DASH (ex: -06, -08, -12). A rosca vem SEMPRE por último mantendo sua unidade nativa (Polegada Fracionária direta com "P" no final para NPT/BSP/Flanges, ou Milímetros para padrão Métrico). As duas medidas devem ser separadas por " X " com espaços. Se a mangueira e a rosca corresponderem ao mesmo tamanho SAE/DASH (ex: mangueira 3/4" que é -12 e rosca ORFS 1.3/16" que também equivale ao tamanho -12), NÃO é um item de salto; nesse caso, retorne apenas o tamanho único (ex: -12) e nunca anexe a rosca separada. Nunca aplique DASH na rosca NPT/BSP/Métrico. Exemplos: NPT Macho de 1/2" com mangueira de 3/4" -> -12 X 1/2P (certo) e não -08 X -12 (errado). Métrico DKOL M30x2.0 com mangueira de 3/4" -> -12 X M30X2.0 (certo) e não M30X2.0 -12 (errado). Para adaptadores (ADAPT HIDR) com roscas diferentes, a estrutura detalha cada lado separadamente contendo [GÊNERO] [TIPO ROSCA] [MEDIDA] (ex: MACH JIC -12 X MACH NPT 3/4P).',
      '8. FILTRO DE GÍRIAS, ERROS E TRADUÇÃO:\n  - MJ/MJ08/MJ[MEDIDA] -> JIC MACHO; AG/AG[MEDIDA] -> METRICO MACHO; AGL/AGL[MEDIDA] -> METRICO MACHO RETO LONGO (com abreviação final contendo MACH RETO LONG); DKOL/DKOS/Alemã giratória -> METRICO GIR; FT 1/2 -> NPT/BSP FEMEA; Face Plana -> ORFS; Flange Leve/Pesada -> C61/C62; Porca louca/PL -> GIR; Niple/Caneco/Espiga -> TERM HIDR; Meia polegada e Dash 8 juntos -> Dash -08.\n  - NORMALIZAÇÃO DE ERRO DE PONTO EM MEDIDAS (IMPORTANTÍSSIMO):\n    * JIC: "11/16" JIC -> "1.1/16" (-12); "15/16" JIC -> "1.5/16" (-16); "15/8" JIC -> "1.5/8" (-20); "17/8" JIC -> "1.7/8" (-24).\n    * ORFS: "13/16" ORFS se for com mangueira de 3/4" (-12) deve ser interpretado como "1.3/16" ORFS (-12). Caso contrário, manter como 13/16" (-08).\n    * ORFS: "17/16" ORFS -> "1.7/16" (-16); "111/16" ou "1.11/16" ORFS -> "1.11/16" (-20).\n  - REGRA RÍGIDA DE GÊNERO/SIGLAS: MF mapeia estritamente para o gênero MACHO (e comportamento FIXO), respeitando a ordem [TIPO ROSCA] [GÊNERO] (Ex: NPT MACHO). FGR mapeia estritamente para GIR RETO. Nunca use GIR se houver MF no bruto ou prefixos como MN (Macho NPT) ou MJ (Macho JIC) no part number.\n  - ATENÇÃO AOS PART NUMBERS KORAX (ex: T100MN-08-12): A Korax utiliza a nomenclatura [ROSCA]-[MANGUEIRA] nos seus sufixos. O "08" indica a rosca NPT de 1/2" e o "12" indica a mangueira de 3/4". Ao gerar a descrição final, siga a regra de salto e coloque a mangueira primeiro em formato DASH e a rosca NPT depois: "-12 X 1/2P". Nunca inverta!\n  - VALIDAÇÃO RÍGIDA DE ROSCA: Se omitir o tipo de rosca e sem part number decodificável, a IA NÃO DEVE adivinhar a rosca. Altere o status para FALTANDO_INFO com a mensagem "Falta especificar o tipo de rosca (ex: JIC, ORFS, NPT, BSP)" ou retorne {"sucesso": false, "motivo": "Falta especificar o tipo de rosca (ex: JIC, ORFS, NPT, BSP)"}.\n  - ROSCAS MÉTRICAS DIN (DKOL/DKOS): Não force M22x1.5. Mapeie a rosca e o passo exatos (ex: 30X2,0 -> M30X2.0) e identifique DKOL (série leve) ou DKOS (série pesada) usando a tabela exata de roscas e tubos.'
    ],
    exemplos: [
      'TERM HIDR JIC GIR 90 GRAUS -08',
      'ADAPTADOR HIDR MACHO NPT 1/2P X MACHO JIC -08',
      'TERM HIDR METRICO MACHO RETO LONGO -06 X M22X1.5',
      'TERM HIDR JIC GIR RETO -06 X -08',
      'FLANGE HIDR BIPARTIDA C62 3/4P',
      'TAMPAO HIDR ORFS FEM RETO -08'
    ],
    system_prompt: 'Você é o motor de PDM (Padrão de Descrição de Materials) integrado ao sistema de estoque SIGA. Sua função é processar inputs brutos, informais, contendo gírias de oficina ou códigos de catálogos (como MJ, AG, AGL, FT, PL, Face Plana, Flange Leve/Pesada) e gerar uma descrição técnica, padronizada e limpa.\n\nRegras de Ouro de Formatação:\n1. Siga estritamente a estrutura: [NOME BASE] [TIPO ROSCA + GÊNERO] [COMPORTAMENTO PORCA] [ANGULAÇÃO] [MEDIDA] [COMPLEMENTO].\n2. Escreva sempre em CAIXA ALTA, usando apenas espaços simples como separadores. Elimine barras (/), parênteses ou pontos decimais de medidas.\n3. Aplique a Matriz de Medidas: JIC/ORFS/FSP convertem-se sempre para DASH (-04, -06, -08...). NPT/BSP/Flanges mantêm-se em POLEGADA FRACIONÁRIA contendo a letra P no final (ex: 1/2P, 3/4P, 1P), mesmo que o bruto não tenha aspas. Roscas DIN convertem-se para MILÍMETROS (M22X1.5).\n4. TABELA DE CONVERSÃO DASH SAE OFICIAL:\n   - -04: Mangueira 1/4" | Rosca JIC 7/16" | Rosca ORFS 9/16"\n   - -06: Mangueira 3/8" | Rosca JIC 9/16" | Rosca ORFS 11/16"\n   - -08: Mangueira 1/2" | Rosca JIC 3/4" | Rosca ORFS 13/16"\n   - -10: Mangueira 5/8" | Rosca JIC 7/8" | Rosca ORFS 1"\n   - -12: Mangueira 3/4" | Rosca JIC 1.1/16" | Rosca ORFS 1.3/16"\n   - -16: Mangueira 1" | Rosca JIC 1.5/16" | Rosca ORFS 1.7/16"\n   - -20: Mangueira 1.1/4" | Rosca JIC 1.5/8" | Rosca ORFS 1.11/16"\n   - -24: Mangueira 1.1/2" | Rosca JIC 1.7/8" | Rosca ORFS 2"\n5. NORMALIZAÇÃO DE ERROS DE PONTO OMITIDO EM ROSCAS JIC E ORFS (CRÍTICO):\n   - É comum mecânicos omitirem o ponto decimal de medidas maiores que 1" (ex: "11/16" em vez de "1.1/16", "13/16" em vez de "1.3/16").\n   - Sempre que identificar a combinação de uma medida fracionária como 11/16, 15/16, 15/8 ou 17/8 associada ao padrão JIC (ex: "11/16X3/4 JIC" onde JIC está ao final do bloco de medidas, ou "11/16 JIC"), normalize SEMPRE adicionando o ponto antes de converter para DASH:\n     * "11/16" JIC -> "1.1/16" JIC -> Dash -12\n     * "15/16" JIC -> "1.5/16" JIC -> Dash -16\n     * "15/8" JIC -> "1.5/8" JIC -> Dash -20\n     * "17/8" JIC -> "1.7/8" JIC -> Dash -24\n   - Da mesma forma para ORFS (Face Plana / Flat Face):\n     * "13/16" ORFS com mangueira de 3/4" (-12) -> "1.3/16" ORFS -> Dash -12\n     * "17/16" ORFS -> "1.7/16" ORFS -> Dash -16\n     * "111/16" ORFS -> "1.11/16" ORFS -> Dash -20\n6. REGRA RÍGIDA DE GÊNERO, SIGLAS E COMPORTAMENTO:\n   - A sigla "MF" significa "Macho Fixo" e mapeia estritamente para o gênero MACHO. Nunca use "GIR" se houver "MF" no texto bruto ou prefixos como "MN" (Macho NPT) ou "MJ" (Macho JIC) no Part Number.\n   - A ordem correta de tipo de rosca e gênero para terminais deve ser sempre [TIPO ROSCA] [GÊNERO] (ex: NPT MACHO, JIC MACHO, ORFS FEMEA).\n   - A sigla "FGR" significa "Fêmea Giratória Reta" e mapeia estritamente para GIR RETO.\n   - Tampões fêmeas (TAMPAO HIDR) são fixos por padrão e devem usar o gênero FEM RETO (ex: TAMPAO HIDR ORFS FEM RETO -08), nunca use GIR ou GIR RETO para tampão fêmea.\n7. REGRA DE INTERPRETAÇÃO DE ROSCA MÉTRICA DIN (PADRÃO ALEMÃO):\n   - É proibido forçar passos genéricos como M22X1.5. Extraia o diâmetro nominal e o passo exatos do texto bruto (ex: "30X2,0X22" vira rosca M30X2.0 com tubo de 22mm).\n   - Identifique e declare o subgrupo específico DKOL (série leve) ou DKOS (série pesada) na rosca cruzando o diâmetro da rosca e o diâmetro do tubo conforme tabela:\n     * DKOL (Série Leve): M12X1.5 (Tubo 6L), M14X1.5 (Tubo 8L), M16X1.5 (Tubo 10L), M18X1.5 (Tubo 12L), M22X1.5 (Tubo 15L), M26X1.5 (Tubo 18L), M30X2.0 (Tubo 22L), M36X2.0 (Tubo 28L), M45X2.0 (Tubo 35L), M52X2.0 (Tubo 42L).\n     * DKOS (Série Pesada): M14X1.5 (Tubo 6S), M16X1.5 (Tubo 8S), M18X1.5 (Tubo 10S), M20X1.5 (Tubo 12S), M22X1.5 (Tubo 14S), M24X1.5 (Tubo 16S), M30X2.0 (Tubo 20S), M36X2.0 (Tubo 25S), M42X2.0 (Tubo 30S), M52X2.0 (Tubo 38S).\n     * Exemplo: "TERMINAL HIDRAULICO 30X2,0X22X3/4 FGR" -> Rosca M30X2.0 com tubo 22L (DKOL) e mangueira 3/4" (-12) com FGR (GIR RETO) -> "TERM HIDR METRICO DKOL GIR RETO -12 X M30X2.0".\n8. POLÍTICA DE VALIDAÇÃO RÍGIDA DE ROSCA (NA DÚVIDA, RECUSE):\n   - Se o texto bruto omitir o tipo de rosca (ex: "TERMINAL HIDRAULICO 1/2X3/4 MF") e não houver um part number claro para decodificar, você NÃO deve chutar ou adivinhar a rosca (não assuma JIC por padrão).\n   - Nesses casos, retorne o JSON de erro: {"status": "FALTANDO_INFO", "message": "Falta especificar o tipo de rosca (ex: JIC, ORFS, NPT, BSP)"}.\n   - Caso exista um part number claro que identifique a rosca (ex: Korax T100MN-08-12, onde "MN" é Macho NPT e "08-12" são as medidas 1/2" e 3/4"), decodifique o part number para extrair o tipo de rosca e aprove o cadastro.\n9. CONTRATO UNIVERSAL DE MEDIDAS DE SALTO: Para qualquer item de salto (ou seja, quando o tamanho SAE/DASH correspondente da mangueira e o tamanho SAE/DASH correspondente da rosca são diferentes, ex: mangueira 3/4" que é -12 e rosca NPT 1/2" que é 1/2P que equivale ao tamanho -08), aplique a regra universal para o bloco de medidas ao final da descrição: [Medida da MANGUEIRA em DASH] X [Medida da ROSCA no padrão nativo]. A mangueira vem SEMPRE primeiro convertida obrigatoriamente para DASH (ex: -06, -08, -12). A rosca vem SEMPRE por último mantendo sua unidade nativa (Polegada Fracionária direta com "P" no final para NPT/BSP/Flanges, ou Milímetros para padrão Métrico). As duas medidas devem ser separadas por " X " com espaços simples. Se a mangueira e a rosca corresponderem ao mesmo tamanho SAE/DASH (ex: mangueira 3/4" que é -12 e rosca ORFS 1.3/16" que também equivale ao tamanho -12), NÃO é um item de salto; nesse caso, retorne apenas o tamanho único (ex: -12) e nunca anexe a rosca separada. Nunca aplique DASH na rosca NPT/BSP ou rosca Métrica. Exemplos: NPT Macho de 1/2" com mangueira de 3/4" -> -12 X 1/2P (certo) e não -08 X -12 (errado). Métrico DKOL M30x2.0 com mangueira de 3/4" -> -12 X M30X2.0 (certo) e não M30X2.0 -12 (errado). Para adaptadores (ADAPT HIDR) com roscas diferentes, a estrutura detalha cada lado separadamente contendo [GÊNERO] [TIPO ROSCA] [MEDIDA] (ex: MACH JIC -12 X MACH NPT 3/4P).\n   - ATENÇÃO AOS PART NUMBERS KORAX (ex: T100MN-08-12): A Korax utiliza a nomenclatura [ROSCA]-[MANGUEIRA] nos seus sufixos. O "08" indica a rosca NPT de 1/2" e o "12" indica a mangueira de 3/4". Ao gerar a descrição final, siga a regra de salto e coloque a mangueira primeiro em formato DASH e a rosca NPT depois: "-12 X 1/2P". Nunca inverta!\n10. Terminais fêmeas giratórios devem usar apenas a sigla "GIR" (omitindo a palavra FEMEA). Terminais machos devem conter a palavra "MACHO".\n\nGere apenas a linha final do PDM, sem comentários ou explicações adicionais.'
  },
  {
    id: 'TUBOS_ESTRUTURAIS',
    nome: 'Tubos Estruturais e Industriais',
    descricao: 'Tubos metálicos de perfil geométrico (quadrados, retangulares, redondos ou industriais) para serralheria e fins estruturais/industriais. Não engloba tubos de condução de fluidos com Schedule.',
    estrutura_linear: 'TUBO [FORMATO] [DIMENSOES] [MATERIAL] {NORMA} {REFERENCIA} {FABRICANTE}',
    diretrizes: [
      '1. Nomenclatura curta fixa obrigatória: TUBO.',
      '2. FORMATO GEOMÉTRICO: QUADRADO, RETANGULAR, REDONDO, INDUSTRIAL.',
      '3. REGRA UNIFICADA DE DIMENSÕES EM CADEIA: Todas as dimensões (espessura de parede, largura, altura/diâmetro e comprimento) unificadas em ordem CRESCENTE separadas por "X" sem espaços e finalizadas com "MM" (Ex: espessura 2mm, largura 100mm, altura 100mm, comprimento 6m -> 2X100X100X6000MM). Converta metros (M) para milímetros (MM) multiplicando por 1000.',
      '4. REGRA CONDICIONAL DE ENTRADA:',
      '   - CASO 1 - MARCA COMPLETO: Mesmo que o item tenha Fabricante e Referência informados, é ESTRITAMENTE OBRIGATÓRIO conter Formato, Material e Dimensões. Marca e referência serão apenas anexadas ao final da string.',
      '   - CASO 2 - GENÉRICO: Se não houver fabricante nem referência, torna-se estritamente OBRIGATÓRIO conter [FORMATO], [DIMENSOES] e [MATERIAL]. Se faltar qualquer um destes, mude status para FALTANDO_INFO.',
      '   - CASO 3 - MARCA INCOMPLETO (TRAVA DE SEGURANÇA): Se contiver apenas o [FABRICANTE] ou apenas a [REFERENCIA], mude status para FALTANDO_INFO.',
      '5. OBRIGATORIEDADE DO MATERIAL: Em itens genéricos, identifique material e revestimento (Ex: AÇO CARBONO, AÇO GALVANIZADO, AÇO INOX 304, ALUMINIO). Se omitido, mude status para FALTANDO_INFO, nunca assuma padrão.',
      '6. REMOÇÃO DE RUÍDOS: Remova peso comercial em quilos (Ex: 36,12KG, KG/M), termos subjetivos (Ex: reforçado, primeira linha) e aplicações irrelevantes (Ex: para chassi).'
    ],
    exemplos: [
      'TUBO QUADRADO 2X50X50X6000MM ACO CARBONO',
      'TUBO RETANGULAR 2X30X50X6000MM ACO GALVANIZADO',
      'TUBO REDONDO 1.5X25X6000MM ACO INOX 304'
    ],
    system_prompt: `Você é o motor de PDM (Padrão de Descrição de Materials) integrado ao sistema de estoque SIGA.
Sua função é higienizar e estruturar os dados para a categoria de Tubos Estruturais e Industriais.

Estrutura Linear Obrigatória: TUBO [FORMATO] [DIMENSOES] [MATERIAL] [NORMA] [REFERENCIA] [FABRICANTE]

Regras Rígidas:
1. Nomenclatura fixa: TUBO.
2. Identifique o formato geométrico: QUADRADO, RETANGULAR, REDONDO ou INDUSTRIAL.
3. Bloco Unificado de Dimensões:
   - Extraia todas as medidas numéricas (espessura de parede, largura, altura ou diâmetro, e comprimento da barra).
   - Ordene as medidas em ordem estritamente CRESCENTE de valores numéricos.
   - Separe as medidas pelo caractere "X" sem espaços intermediários.
   - Adicione "MM" ao final do bloco (Ex: 2X50X50X6000MM).
   - Converta o comprimento se informado em metros para milímetros (ex: 6M ou 6,0M -> 6000MM).
   - Mapeie espessuras em chapas comerciais de aço carbono para milímetros (Chapa 18 -> 1.2; Chapa 16 -> 1.5; Chapa 14 -> 2; Chapa 12 -> 2.6; Chapa 11 -> 3).
   - Converta dimensões em polegadas nas dimensões para milímetros comerciais (ex: 2" -> 50.8 ou 50; 1.1/2" -> 38.1 ou 38; 1/8" -> 3; 1/4" -> 6.35 ou 6).
4. Regras de Validação de Entrada:
   - Formato, Material e Dimensões são ESTRITAMENTE OBRIGATÓRIOS. Mesmo que o item tenha Fabricante e Referência de catálogo informados, se faltar formato, material ou dimensões, o status deve ser FALTANDO_INFO.
   - Se houver FABRICANTE e REFERENCIA (Item de Marca Completo): anexe-os limpos no final da descrição. NUNCA escreva rótulos literais como "REFERENCIA", "MARCA" ou "REF" antes dos valores. Coloque apenas os valores brutos (Ex: TUBO QUADRADO 2X50X50X6000MM ACO CARBONO TG-5050 GERDAU).
   - Se houver apenas FABRICANTE ou apenas REFERENCIA (Marca Incompleto): retorne {"status": "FALTANDO_INFO", "message": "Item de marca incompleto. Especifique fabricante e referência, ou remova os dados parciais de marca para cadastrar como genérico."}.
5. Remova peso teórico/comercial (KG, KG/M), termos subjetivos (reforçado, primeira linha) e aplicações.`
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
  { termo: 'PRETO', abreviacao: 'PT' },
  { termo: 'ADAPTADOR', abreviacao: 'ADAPT' },
  { termo: 'GRAUS', abreviacao: 'G' },
  { termo: 'HIDRAULICO', abreviacao: 'HIDR' },
  { termo: 'TERMINAL', abreviacao: 'TERM' },
  { termo: 'MACHO', abreviacao: 'MACH' },
  { termo: 'FEMEA', abreviacao: 'FEM' },
  { termo: 'GIRATORIA', abreviacao: 'GIRAT' },
  { termo: 'GIRATORIO', abreviacao: 'GIRAT' },
  { termo: 'FURO', abreviacao: 'F' }
];
