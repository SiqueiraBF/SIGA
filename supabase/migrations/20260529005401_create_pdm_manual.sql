-- Migration to support Technical PDM Manual and AI Configuration
-- Created: 2026-05-29

-- Create pdm_categorias table
CREATE TABLE IF NOT EXISTS pdm_categorias (
    id VARCHAR(100) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    estrutura_linear TEXT,
    diretrizes JSONB DEFAULT '[]'::jsonb,
    exemplos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create pdm_abreviacoes table
CREATE TABLE IF NOT EXISTS pdm_abreviacoes (
    termo VARCHAR(255) PRIMARY KEY,
    abreviacao VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create pdm_grupos_tipos table
CREATE TABLE IF NOT EXISTS pdm_grupos_tipos (
    id VARCHAR(100) PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    exemplos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for all tables
ALTER TABLE pdm_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_abreviacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_grupos_tipos ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read PDM data
CREATE POLICY "Permitir leitura publica autenticada para pdm_categorias" ON pdm_categorias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir leitura publica autenticada para pdm_abreviacoes" ON pdm_abreviacoes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir leitura publica autenticada para pdm_grupos_tipos" ON pdm_grupos_tipos FOR SELECT USING (auth.role() = 'authenticated');

-- Only Administrador can modify
CREATE POLICY "Apenas admins podem modificar pdm_categorias" ON pdm_categorias FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u JOIN funcoes f ON u.funcao_id = f.id WHERE u.id = auth.uid() AND f.nome = 'Administrador')
);
CREATE POLICY "Apenas admins podem modificar pdm_abreviacoes" ON pdm_abreviacoes FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u JOIN funcoes f ON u.funcao_id = f.id WHERE u.id = auth.uid() AND f.nome = 'Administrador')
);
CREATE POLICY "Apenas admins podem modificar pdm_grupos_tipos" ON pdm_grupos_tipos FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios u JOIN funcoes f ON u.funcao_id = f.id WHERE u.id = auth.uid() AND f.nome = 'Administrador')
);

-- Seed pdm_categorias
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'ABRACADEIRAS',
    'Abracadeiras',
    'Abracadeiras. Atributos sugeridos: Complemento (tipo), Diametro de amarração, Material de fabricação, Classe de normalização, Nome comerc./Linha/Marca, Fabricante, Referencia',
    'ABRACADEIRAS [COMPLEMENTO (TIPO)] [DIAMETRO DE AMARRAÇÃO] [MATERIAL DE FABRICAÇÃO] [CLASSE DE NORMALIZAÇÃO] [NOME COMERC./LINHA/MARCA] [FABRICANTE] [REFERENCIA]',
    '["1. Nomenclatura curta: ABRACADEIRA.","2. Obrigatório: Complemento (tipo), Diametro de amarração, Material de fabricação, Classe de normalização e outros atributos se aplicável."]'::jsonb,
    '["ABRACAD U 3/4P AG SAE1020","ABRACAD BOSCH F000600243"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'CAMARA_DE_AR',
    'Camara de Ar',
    'Camara de Ar. Atributos sugeridos: Dimensões, Modelo valvula, Fabricante, Referencia',
    'CAMARA DE AR [DIMENSÕES] [MODELO VALVULA] [FABRICANTE] [REFERENCIA]',
    '["1. Nomenclatura curta: CAMARA DE AR.","2. Obrigatório: Dimensões, Modelo valvula, Fabricante, Referencia."]'::jsonb,
    '["CAMARA AR 12.4 R36 AT2036","CAMARA AR JUMIL 9601027"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'PORCA',
    'Porca',
    'Porca. Atributos sugeridos: Complemento (tipo), ??? (SIST. TRAVA), Bitola, Tipo de Rosca, Material de fabricação, Acabamento, Fabricante, Referencia/Norma',
    'PORCA [COMPLEMENTO (TIPO)] [??? (SIST. TRAVA)] [BITOLA] [TIPO DE ROSCA] [MATERIAL DE FABRICAÇÃO] [ACABAMENTO] [FABRICANTE] [REFERENCIA/NORMA]',
    '["1. Nomenclatura curta: PORCA.","2. Obrigatório: Complemento (tipo), ??? (SIST. TRAVA), Bitola, Tipo de Rosca e outros atributos se aplicável."]'::jsonb,
    '["PORCA SEXT 5/32P UNC AG","PORCA SEG J DEERE L116259"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'ALIMENTOS',
    'Alimentos',
    'Alimentos. Atributos sugeridos: Complemento (tipo), Fabricante/Marca, Obs.: A unidade de medida deve ser sempre KG ou L., ARROZ TIPO 1, CHA ERVA DOCE, CARNE FRANGO ASA, BISCOITO AGUA E SAL AMANTEIGADO, BISCOITO COCO',
    'ALIMENTOS [COMPLEMENTO (TIPO)] [FABRICANTE/MARCA] [OBS.: A UNIDADE DE MEDIDA DEVE SER SEMPRE KG OU L.] [ARROZ TIPO 1] [CHA ERVA DOCE] [CARNE FRANGO ASA] [BISCOITO AGUA E SAL AMANTEIGADO] [BISCOITO COCO]',
    '["1. Nomenclatura curta: ARROZ.","2. Obrigatório: Complemento (tipo), Fabricante/Marca, Obs.: A unidade de medida deve ser sempre KG ou L., ARROZ TIPO 1 e outros atributos se aplicável."]'::jsonb,
    '[]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'CORREIA_TRANSPORTADORA',
    'Correia transportadora',
    'Correia transportadora. Atributos sugeridos: Aplicação/Tipo, Número de lonas, Espessura da cobertura superior, Espessura da cobertura inferior, Largura da correia, Fabricante, Referencia/Modelo, Obs.: A informação da espessura das coberturas não se aplica a correias laminadas',
    'CORREIA TRANSPORTADORA [APLICAÇÃO/TIPO] [NÚMERO DE LONAS] [ESPESSURA DA COBERTURA SUPERIOR] [ESPESSURA DA COBERTURA INFERIOR] [LARGURA DA CORREIA] [FABRICANTE] [REFERENCIA/MODELO] [OBS.: A INFORMAÇÃO DA ESPESSURA DAS COBERTURAS NÃO SE APLICA A CORREIAS LAMINADAS]',
    '["1. Nomenclatura curta: CORREIA TRANSPORTADORA.","2. Obrigatório: Aplicação/Tipo, Número de lonas, Espessura da cobertura superior, Espessura da cobertura inferior e outros atributos se aplicável."]'::jsonb,
    '["CORREIA ACH AE AO 4L 72P MERCURIO PN2200","CORREIA LAM ACH AE 4L 15P KAUTHEC KTCL3","CORREIA TG 1/8X1/8X13P MERCURIO 5PN2200"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'MADEIRAS',
    'Madeiras',
    'Madeiras. Atributos sugeridos: Espessura/Diametro, Largura, Comprimento, Tipo da madeira',
    'MADEIRAS [ESPESSURA/DIAMETRO] [LARGURA] [COMPRIMENTO] [TIPO DA MADEIRA]',
    '["1. Nomenclatura curta: TABUA.","2. Obrigatório: Espessura/Diametro, Largura, Comprimento, Tipo da madeira."]'::jsonb,
    '["TABUA MAD 20X250X5000MM","CAIBRO MAD 50X55X400MM","BEIRAL MAD 250X4000MM","CHAPA MAD COMP 15X1100X1900MM","CHAPA MADEIRITE RESIN 10X110X220MM"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'LUBRIFICANTE',
    'Lubrificante',
    'Lubrificante. Atributos sugeridos: Característica, Nome Comercial, Fabricante/Marca, Referencia',
    'LUBRIFICANTE [CARACTERÍSTICA] [NOME COMERCIAL] [FABRICANTE/MARCA] [REFERENCIA]',
    '["1. Nomenclatura curta: OLEO LUBR.","2. Obrigatório: Característica, Nome Comercial, Fabricante/Marca, Referencia."]'::jsonb,
    '["OLEO LUBR 15W40 PLUS 50 JD 132456"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'ANEIS',
    'Aneis',
    'Aneis. Atributos sugeridos: Complemento (tipo), Dimensões (Diâm. Interno), Dimensões (Diâm. Externo), Material de fabricação, Classe de normalização, Fabricante, Referencia',
    'ANEIS [COMPLEMENTO (TIPO)] [DIMENSÕES (DIÂM. INTERNO)] [DIMENSÕES (DIÂM. EXTERNO)] [MATERIAL DE FABRICAÇÃO] [CLASSE DE NORMALIZAÇÃO] [FABRICANTE] [REFERENCIA]',
    '["1. Nomenclatura curta: ANEL.","2. Obrigatório: Complemento (tipo), Dimensões (Diâm. Interno), Dimensões (Diâm. Externo), Material de fabricação e outros atributos se aplicável."]'::jsonb,
    '["ANEL AJUSTE 1.5X35MM AC SAE1020","ANEL ELAST CASE 10311200"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'PARAFUSOS',
    'Parafusos',
    'Parafusos. Atributos sugeridos: Tipo da Cabeça, Complemento (tipo), Bitola, Comprimento, Tipo de Rosca, Material de fabricação, Acabamento, Torque, Fabricante, Referencia/Norma',
    'PARAFUSOS [TIPO DA CABEÇA] [COMPLEMENTO (TIPO)] [BITOLA] [COMPRIMENTO] [TIPO DE ROSCA] [MATERIAL DE FABRICAÇÃO] [ACABAMENTO] [TORQUE] [FABRICANTE] [REFERENCIA/NORMA]',
    '["1. Nomenclatura curta: PARAF.","2. Obrigatório: Tipo da Cabeça, Complemento (tipo), Bitola, Comprimento e outros atributos se aplicável."]'::jsonb,
    '["PARAF ALLEN C CAB 12X35MM UNC AC BICR","PARAF CAB FRANC 12X40MM CNH 380530"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'ROLAMENTOS',
    'Rolamentos',
    'Rolamentos. Atributos sugeridos: Complemento (tipo), Blindagem, Referencia, Fabricante',
    'ROLAMENTOS [COMPLEMENTO (TIPO)] [BLINDAGEM] [REFERENCIA] [FABRICANTE]',
    '["1. Nomenclatura curta: ROLAMENTO.","2. Obrigatório: Complemento (tipo), Blindagem, Referencia, Fabricante."]'::jsonb,
    '["ROL AUTOCOMP ROLO CILIN 21306CC SKF","ROL ROLO F CILIN 22207E SKF"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'FILTROS',
    'Filtros',
    'Filtros. Atributos sugeridos: Aplicação, Fabricante, Referencia, Obs.: Para os cadastros antigos, de aplicação em veículo ou implemento agrícola, não há a necessidade de bloqueá-lo por falta de informação (aplicação), somente para os cadastros novos é obrigatória a informação da aplicação do filtro.',
    'FILTROS [APLICAÇÃO] [FABRICANTE] [REFERENCIA] [OBS.: PARA OS CADASTROS ANTIGOS, DE APLICAÇÃO EM VEÍCULO OU IMPLEMENTO AGRÍCOLA, NÃO HÁ A NECESSIDADE DE BLOQUEÁ-LO POR FALTA DE INFORMAÇÃO (APLICAÇÃO), SOMENTE PARA OS CADASTROS NOVOS É OBRIGATÓRIA A INFORMAÇÃO DA APLICAÇÃO DO FILTRO.]',
    '["1. Nomenclatura curta: FILTRO.","2. Obrigatório: Aplicação, Fabricante, Referencia, Obs.: Para os cadastros antigos, de aplicação em veículo ou implemento agrícola, não há a necessidade de bloqueá-lo por falta de informação (aplicação), somente para os cadastros novos é obrigatória a informação da aplicação do filtro.."]'::jsonb,
    '["FILTRO AGUA MONTANA 71000970","FILTRO AR J DEERE AL177184","FILTRO COMB J DEERE CAV296","FILTRO HIDR J DEERE AE43494","FILTRO LUBR J DEERE RE57394"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'FORMULARIOS',
    'Formulários',
    'Formulários. Atributos sugeridos: Aplicação/Tipo, Largura da página, Comprimento da página, Número de vias, Número de páginas',
    'FORMULÁRIOS [APLICAÇÃO/TIPO] [LARGURA DA PÁGINA] [COMPRIMENTO DA PÁGINA] [NÚMERO DE VIAS] [NÚMERO DE PÁGINAS]',
    '["1. Nomenclatura curta: FORMULARIO.","2. Obrigatório: Aplicação/Tipo, Largura da página, Comprimento da página, Número de vias e outros atributos se aplicável."]'::jsonb,
    '["FORM CONT 40X280MM 2V 5000FL","FORM CLASSICACAO SOJA 130X210MM 3V 100FL"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'FIOS_CABOS_ELETRICOS',
    'Fios/Cabos Elétricos',
    'Fios/Cabos Elétricos. Atributos sugeridos: Marca/Fabricante, Material condutor, Revestimento/Isolação, Encordoamento, Número de vias, Seção nominal, Tensão suportada, Classe de temperatura, Cor',
    'FIOS/CABOS ELÉTRICOS [MARCA/FABRICANTE] [MATERIAL CONDUTOR] [REVESTIMENTO/ISOLAÇÃO] [ENCORDOAMENTO] [NÚMERO DE VIAS] [SEÇÃO NOMINAL] [TENSÃO SUPORTADA] [CLASSE DE TEMPERATURA] [COR]',
    '["1. Nomenclatura curta: CABO.","2. Obrigatório: Marca/Fabricante, Material condutor, Revestimento/Isolação, Encordoamento e outros atributos se aplicável."]'::jsonb,
    '["CABO COBRE PP FLEX 4X16MM2 1KV 90G","CABO AFUMEX PRYSMIAN 10MM2 BRA 750V","FIO COBRE PVC 1.5MM2 750V 70G","FIO COBRE NU ESM PEI 29AWG 200G","FIO ALUM ESM PEI27AWG 180G"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'COMBUSTIVEL',
    'Combustível',
    'Combustível. Atributos sugeridos: Característica',
    'COMBUSTÍVEL [CARACTERÍSTICA]',
    '["1. Nomenclatura curta: OLEO EXTRA DIESEL.","2. Obrigatório: Característica."]'::jsonb,
    '["OLEO EXTRA DIESEL B S500"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'ARRUELA',
    'Arruela',
    'Arruela. Atributos sugeridos: Complemento (tipo), Dimensões, Material de fabricação, Acabamento, Fabricante, Referencia/Norma, Largura do pneu, Perfil, Construção, Aro, Nº de lonas, Indicador de carga maxima, Indicador de velocidade maxima, Fabricante, Desenho',
    'ARRUELA [COMPLEMENTO (TIPO)] [DIMENSÕES] [MATERIAL DE FABRICAÇÃO] [ACABAMENTO] [FABRICANTE] [REFERENCIA/NORMA] [LARGURA DO PNEU] [PERFIL] [CONSTRUÇÃO] [ARO] [Nº DE LONAS] [INDICADOR DE CARGA MAXIMA] [INDICADOR DE VELOCIDADE MAXIMA] [FABRICANTE] [DESENHO]',
    '["1. Nomenclatura curta: PNEU.","2. Obrigatório: Complemento (tipo), Dimensões, Material de fabricação, Acabamento e outros atributos se aplicável."]'::jsonb,
    '["ARRUELA PRESS 3/8P AC BICR","ARRUELA AC WARTSILA PAAC000685","Pneu","PNEU 10.00 R20 6L 147K MICHELIN FORCE XZY3","PNEU 175 70 R14 2L 88T MICHELIN ENERGY XM2"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'CHAPAS',
    'Chapas',
    'Chapas. Atributos sugeridos: Complemento (tipo), Espessura da chapa, Diâmetro ou Largura e, Comprimento do furo, Largura da chapa, Comprimento da chapa, Material de fabricação, Normalização, Fabricante, Referencia, *Obs.: - As medidas devem ser sempre informadas em ordem crescente, portanto pode-se informar primeiramente a espessura ou o diâmetro do furo.
  - As dimensões devem ser bem detalahdas no texto dados básicos do material.',
    'CHAPAS [COMPLEMENTO (TIPO)] [ESPESSURA DA CHAPA] [DIÂMETRO OU LARGURA E] [COMPRIMENTO DO FURO] [LARGURA DA CHAPA] [COMPRIMENTO DA CHAPA] [MATERIAL DE FABRICAÇÃO] [NORMALIZAÇÃO] [FABRICANTE] [REFERENCIA] [*OBS.: - AS MEDIDAS DEVEM SER SEMPRE INFORMADAS EM ORDEM CRESCENTE, PORTANTO PODE-SE INFORMAR PRIMEIRAMENTE A ESPESSURA OU O DIÂMETRO DO FURO.
  - AS DIMENSÕES DEVEM SER BEM DETALAHDAS NO TEXTO DADOS BÁSICOS DO MATERIAL.]',
    '["1. Nomenclatura curta: CHAPA.","2. Obrigatório: Complemento (tipo), Espessura da chapa, Diâmetro ou Largura e, Comprimento do furo e outros atributos se aplicável."]'::jsonb,
    '["CHAPA PERF 3X6X1000X3000MM AC SAE1020","CHAPA EXP 4X5X6X1000X3000MM AC SAE1020","CHAPA XADR 6X1000X3000MM AC SAE 1020","CHAPA LISA 6X1000X3000MM AC SAE 1020"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'CORREIA_TRANSMISSAO',
    'Correia transmissão',
    'Correia transmissão. Atributos sugeridos: Tipo, Perfil (Para correias V), Modelo (Para correias V), Fabricante, Referencia, Obs.: Para as correias V, a referencia não é uma informação obrigatória, porém o perfil deve ser informado.',
    'CORREIA TRANSMISSÃO [TIPO] [PERFIL (PARA CORREIAS V)] [MODELO (PARA CORREIAS V)] [FABRICANTE] [REFERENCIA] [OBS.: PARA AS CORREIAS V, A REFERENCIA NÃO É UMA INFORMAÇÃO OBRIGATÓRIA, PORÉM O PERFIL DEVE SER INFORMADO.]',
    '["1. Nomenclatura curta: CORREIA.","2. Obrigatório: Tipo, Perfil (Para correias V), Modelo (Para correias V), Fabricante e outros atributos se aplicável."]'::jsonb,
    '["CORREIA DENT GATES 40707X20XS","CORREIA V B86 GOODYEAR"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'VIDROS',
    'Vidros',
    'Vidros. Atributos sugeridos: Espessura, Tipo',
    'VIDROS [ESPESSURA] [TIPO]',
    '["1. Nomenclatura curta: VIDRO.","2. Obrigatório: Espessura, Tipo."]'::jsonb,
    '["VIDRO 3MM FANTASIA CANELADO","VIDRO 10MM TEMPERADO","VIDRO 6MM LAM"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'CARTUCHO_IMPRESSORA',
    'Cartucho impressora',
    'Cartucho impressora. Atributos sugeridos: Aplicação, Modelo/Número, Fabricante, Referencia, Cor',
    'CARTUCHO IMPRESSORA [APLICAÇÃO] [MODELO/NÚMERO] [FABRICANTE] [REFERENCIA] [COR]',
    '["1. Nomenclatura curta: CARTUCHO.","2. Obrigatório: Aplicação, Modelo/Número, Fabricante, Referencia e outros atributos se aplicável."]'::jsonb,
    '["CARTUCHO IMPRESS 11 HP C4586 CIANO","CARTUCHO IMPRESS 117 EPSON T117120","CARTUCHO IMPRESS 27 LEXMARK 10N0227 COL"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_categorias (id, nome, descricao, estrutura_linear, diretrizes, exemplos)
VALUES (
    'GRAXA',
    'Graxa',
    'Graxa. Atributos sugeridos: Grau de consistência, Nome Comercial, Fabricante/Marca, Referencia',
    'GRAXA [GRAU DE CONSISTÊNCIA] [NOME COMERCIAL] [FABRICANTE/MARCA] [REFERENCIA]',
    '["1. Nomenclatura curta: GRAXA.","2. Obrigatório: Grau de consistência, Nome Comercial, Fabricante/Marca, Referencia."]'::jsonb,
    '["GRAXA NLGI1 MAXLUB BARDAHL 123456"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    estrutura_linear = EXCLUDED.estrutura_linear,
    diretrizes = EXCLUDED.diretrizes,
    exemplos = EXCLUDED.exemplos;

-- Seed pdm_grupos_tipos
INSERT INTO pdm_grupos_tipos (id, titulo, descricao, exemplos)
VALUES (
    'MAT__AUX___DE_CONSUMO__MATERIAL_DE_USO_E_CONSUMO_',
    'Mat. Aux./ de Consumo (Material de uso e consumo)',
    'Utilizar para materiais cujo consumo não decorra do processo de produção/industrialização. Não sendo necessário à obtenção do produto final. Materiais de bens duráveis e não duráveis.',
    '["PARAF ALLEN C CAB 10X20MM R UNC AC 8.8","PAPEL A4 210X297MM 500FL","ROL AUTO COMP ROLO CILIN 22317 SKF","COPO DESC 180ML 100UN PS"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    descricao = EXCLUDED.descricao,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_grupos_tipos (id, titulo, descricao, exemplos)
VALUES (
    'MATERIAIS_IMPORTACAO',
    'Materiais Importação',
    'Utilizar na aquisição de materiais importados, que necessitem de descrição em outros idiomas.',
    '["GOVERNOR W6L20 WARTSILA PAAE227551","BALL BEARING WESTFALIA 00116012680","LOWER HOUSING R ROYCE 5152300","ORING WARTSILA 1260034"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    descricao = EXCLUDED.descricao,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_grupos_tipos (id, titulo, descricao, exemplos)
VALUES (
    'EQUIPAMENTOS_INFORMATICA',
    'Equipamentos Informática',
    'Utilizar nas aquisições de equipamentos eletrônicos que precisam de homologação da área de TI.',
    '["IMPRESS MULTIF HP DESKJET1000","IPHONE 16 1TB APPLE","COMP DESKTOP DELL OPTIPLEX 7010","SOFTWARE OFFICE HOME AND BUSINESS 2013"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    descricao = EXCLUDED.descricao,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_grupos_tipos (id, titulo, descricao, exemplos)
VALUES (
    'ATIVO_IMOBILIZADO',
    'Ativo Imobilizado',
    'Utilizar nas compras de ativo imobilizado com valor maior que R$ 326,61 e vida útil superior a um ano.',
    '["MESA 700X700X850MM AI","ARMARIO 16PORT 1230X1980MM AC","CAMINHONETE S10 LTZ DUPL FLEX 2.4","TRATOR VALTRA BM120"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    descricao = EXCLUDED.descricao,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_grupos_tipos (id, titulo, descricao, exemplos)
VALUES (
    'MATERIAIS_DE_SSO',
    'Materiais de SSO',
    'Utilizar nas aquisições de EPI (Equipamento de Proteção Individual) e EPC (Equipamento de Proteção Coletiva).',
    '["BOTA PVC BICOLOR ALPARGATA 786 N38","CALCA DUPONT 3003PRO N40","CAPACETE SEG BR MSA 101MJCA","OCULOS LENTE INC UD SPERIAN S910"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    descricao = EXCLUDED.descricao,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_grupos_tipos (id, titulo, descricao, exemplos)
VALUES (
    'PRESTACOES_DE_SERVICO__MM01_',
    'Prestações de Serviço (MM01)',
    'Utilizar nas aquisição de material tipo serviço. Trata-se de serviços cadastrados como materiais devido à escrituração fiscal.',
    '["FRETE ROD KG P GROSSA PR X CN PARECIS MT","ENVELOPE SIMPL GAM 220X480MM 4X0 COUCHE","PREST SERV GRAFICO","ENVELOPE SACO FAM 260X360MM 4X0 COUCHE"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    descricao = EXCLUDED.descricao,
    exemplos = EXCLUDED.exemplos;
INSERT INTO pdm_grupos_tipos (id, titulo, descricao, exemplos)
VALUES (
    'MATERIAIS_RECUPERAVEIS',
    'Materiais Recuperáveis',
    'Utilizar nas contratações de serviços referente a recondicionamento e/ou recuperação de materiais.',
    '["TURBINA 294041 REC","ROTOR 12V 90A 20368 REC","PNEU 215 75 R17.5 REC","MOTOR HIDR 1031013010 REC"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    descricao = EXCLUDED.descricao,
    exemplos = EXCLUDED.exemplos;

-- Seed pdm_abreviacoes (600+ records)
INSERT INTO pdm_abreviacoes (termo, abreviacao) VALUES ('ABASTECIMENTO', 'ABASTEC'), ('ABRACADEIRA', 'ABRAC'), ('ABSORVENTE', 'ABSORV'), ('ACABAMENTO', 'ACAB'), ('ACELERADOR (A)', 'ACELERAD'), ('ACIONADOR (A)', 'ACIONAD'), ('ACIONAMENTO', 'ACIONAM'), ('ACO CARBONO', 'AC'), ('AÇO CROMO VANADIO TEMPERADO', 'ACVT'), ('ACO FORJADO', 'AF'), ('ACO GALVANIZADO', 'AG'), ('ACO GALVANIZADO FOGO', 'AGF'), ('ACO INOX', 'AI'), ('ACO NIQUELADO', 'AN'), ('ACO POLIDO', 'AP'), ('ACO RAPIDO', 'AR'), ('ACO ZINCADO', 'AZ'), ('ACOPLAMENTO', 'ACOPLAMEN'), ('ACOPLADOR', 'ACOPLAD'), ('ACRILICO', 'ACRIL'), ('ADAPTADOR (A)', 'ADAPT'), ('ADESIVADA', 'ADES'), ('ADIPOMETRO', 'ADIPOM'), ('ADMISSAO', 'ADMISS'), ('AJUSTAVEL', 'AJUST'), ('ALAMBRADO', 'ALAMBR'), ('ALCALINA', 'ALC'), ('ALIMENTACAO', 'ALIM'), ('ALIMENTADORA', 'ALIMENTAD'), ('ALMA DE ACO', 'CAA'), ('ALTERNADOR', 'ALTERN'), ('ALUMINIO', 'ALUM'), ('AMARRACAO', 'AMARR'), ('AMORTECEDOR', 'AMORTEC'), ('AMORTECIMENTO', 'AMORTECIM'), ('AMPERAGEM', 'A'), ('AMPLIFICADOR (A)', 'AMPLIFIC'), ('ANEMOMETRO', 'ANEMOM'), ('ANGULAR', 'ANG'), ('ANTICHAMA', 'ACH'), ('ANTIDERRAPANTE', 'ANTIDERR'), ('ANTROPOMETRO', 'ANTROPOM'), ('APARADOR (A)', 'APARAD'), ('AQUECEDOR (A)', 'AQUEC'), ('AR CONDICIONADO', 'AR COND'), ('ARTICULACAO', 'ARTICULAC'), ('ARTICULADA', 'ARTICUL'), ('ATERRAMENTO', 'ATERR'), ('ATUADOR', 'ATUAD'), ('AUDIOMETRO', 'AUDIOM'), ('AUTO ATARRAXANTE', 'AUTO ATARR'), ('AUTO BROCANTE', 'AUTO BROC'), ('AUTOMACAO', 'AUTOMAC'), ('AUTOMATICO (A)', 'AUTOMATIC'), ('AUTOMOVEL', 'AUTOMOV'), ('AUTOTRAVANTE', 'AUTOTRAV'), ('AUXILIAR', 'AUX'), ('AZULEJO', 'AZULE'), ('BALDE', 'BAL'), ('BAROMETRO', 'BAROM'), ('BARRAMENTO', 'BARRAMEN'), ('BASCULADOR', 'BASCULAD'), ('BASCULANTE', 'BASC'), ('BICO FINO QUENTE', 'BFQ'), ('BICROMATIZADO', 'BICR'), ('BIFASICO', '2F'), ('BILONGADA', 'BILONG'), ('BIPARTIDA', 'BIP'), ('BIPOLAR', '2POL'), ('BIVOLTAGEM', 'BIV'), ('BLINDADO (A)', 'BLIND'), ('BLINDAGEM', 'BLINDAG'), ('BLOQUEIO', 'BLOQ'), ('BORBOLETA', 'BORB'), ('BORRACHA', 'BORR'), ('BRILHANTE', 'BRIL'), ('BRONZE', 'BRONZ'), ('CABECA', 'CAB'), ('CABECA ABAULADA', 'CAB ABAULAD'), ('CABECA CHATA', 'CAB CH'), ('CABECA CILINDRICA', 'CAB CILIN'), ('CABECA CONICA', 'CAB CON'), ('CABECA DE LENTILHA', 'CAB LENT'), ('CABECA DE PANELA', 'CAB PAN'), ('CABECA FRANCESA', 'CAB FRANC'), ('CABECA OVAL', 'CAB OVAL'), ('CABECA REDONDA', 'CAB RED'), ('CAIXA', 'CX'), ('CALANDRADO (A)', 'CALAND'), ('CALCADOR', 'CALCAD'), ('CANTONEIRA', 'CANTON'), ('CAPACIMETRO', 'CAPACIM'), ('CAPACITIVA', 'CAPACIT'), ('CAPSULA', 'CAPS'), ('CARCACA', 'CARC'), ('CATALISADOR (A)', 'CATALIS'), ('CATEGORIA', 'CAT'), ('CENTRAL', 'CENT'), ('CENTRIFUGA', 'CENTRIF'), ('CERAMICA', 'CERAM') ON CONFLICT (termo) DO UPDATE SET abreviacao = EXCLUDED.abreviacao;
INSERT INTO pdm_abreviacoes (termo, abreviacao) VALUES ('CHAPA', 'CH'), ('CHATA', 'CHAT'), ('CHAVEADA', 'CHAV'), ('CHUMBADOR', 'CHUMB'), ('CILINDRO', 'CILIN'), ('CIRCUITO', 'CIRCUIT'), ('CIRCULAR', 'CIRCUL'), ('COBERTURA', 'COBERT'), ('COM', 'C'), ('COM CABECA', 'C CAB'), ('COM COSTURA', 'CC'), ('COMANDO', 'COMAND'), ('COMBINADA', 'COMBIN'), ('COMBUSTIVEL', 'COMB'), ('COMERCIAL', 'COMERC'), ('COMPACTADOR (A)', 'COMPAC'), ('COMPONENTE', 'COMP'), ('COMPLETO (A)', 'COMPL'), ('COMPRIMIDO', 'COMPRIM'), ('COMPRESSOR', 'COMPRESS'), ('COMPUTADOR', 'COMP'), ('COMUTADORA', 'COMUT'), ('CONCAVA', 'CONC'), ('CONDENSADOR DE AR (SPLIT)', 'COND AR'), ('CONDENSADOR', 'COND'), ('CONDULETE', 'CONDUL'), ('CONECTOR', 'CONECT'), ('CONEXAO', 'CONEX'), ('CONFINA OURO', 'CONF OURO'), ('CONICO (A)', 'CON'), ('CONJUGADO', 'CONJUG'), ('CONJUNTO', 'CJ'), ('CONSUMO', 'CONS'), ('CONTAMINADO (A)', 'CONTAM'), ('CONTENCAO', 'CONTENC'), ('CONTRATO', 'CONTRAT'), ('CONTROLE', 'CONTR'), ('CONVERSOR (A)', 'CONV'), ('CONVENCIONAL', 'CONVEN'), ('CORRUGADO', 'CORRUG'), ('CRONOMETRO', 'CRONOM'), ('CROMADO', 'CROM'), ('CRYOSTEAM', 'CRY'), ('COTOVELO', 'COTOV'), ('CURVADA', 'CURV'), ('DECIBEIS', 'DB'), ('DEFLETOR', 'DEFLET'), ('DENSIMETRO', 'DENSIM'), ('DENTADA', 'DENT'), ('DENTES', 'D'), ('DERIVADO', 'DERIVAD'), ('DESBASTE', 'DESB'), ('DESCARTAVEL', 'DESC'), ('DESENTUPIDOR (A)', 'DESENTUP'), ('DESFIBRADOR (A)', 'DESFIBR'), ('DESFIBRILADOR', 'DESFIBRILAD'), ('DESLIZADOR (A)', 'DESLIZAD'), ('DESLIZANTE', 'DESLIZ'), ('DESODORIZADOR (A)', 'DESODORIZ'), ('DESTINACAO', 'DEST'), ('DESUMIDIFICADOR (A)', 'DESUMID'), ('DETECTOR', 'DETEC'), ('DETERMINADOR', 'DETERMIN'), ('DIANTEIRO', 'DIANT'), ('DIAFRAGMA', 'DIAFRAG'), ('DIRECIONAL', 'DIRECION'), ('DIFERENCIAL', 'DIF'), ('DIGITAIS', 'DIGIT'), ('DIGITAL', 'DIG'), ('DINAMOMETRO', 'DINAMOM'), ('DIRECAO', 'DIREC'), ('DIREITO (A)', 'DIR'), ('DISEL / DIESEL', 'DIE'), ('DISJUNTOR', 'DISJ'), ('DISPENSADOR', 'DISPENS'), ('DISPOSITIVO', 'DISP'), ('DISTANCIADORA', 'DISTANC'), ('DISTRIBUICAO', 'DISTRIB'), ('DISTRIBUIDOR (A)', 'DIST'), ('DIVERSO', 'DIV'), ('DOBRADO (A)', 'DOBR'), ('DOBRAS', 'DBR'), ('DREMOMETER', 'DERMOMET'), ('DUPLO (A)', 'DUPL'), ('ECOBATIMETRO', 'ECOBATIM'), ('ELASTICO', 'ELAST'), ('ELASTOMERO TERMOPLASTICO', 'TPE'), ('ELEMENTO', 'ELEM'), ('ELETRICO', 'ELETR'), ('ELETROCALHA', 'ELETROC'), ('ELETRODUTO', 'ELETROD'), ('ELETROLITICO', 'ELETROLIT'), ('ELETROMAGNETICO', 'ELETROMAG'), ('ELETRONICO (A)', 'ELETRON'), ('ELEVACAO', 'ELEVAC'), ('ELEVADOR', 'ELEV'), ('EMBALAGEM', 'EMBALAG'), ('EMBORRACHADO', 'EMBORR'), ('EMBARCACAO', 'EMBARC'), ('EMBREAGEM', 'EMBREAG') ON CONFLICT (termo) DO UPDATE SET abreviacao = EXCLUDED.abreviacao;
INSERT INTO pdm_abreviacoes (termo, abreviacao) VALUES ('EMBUCHAMENTO', 'EMBUCH'), ('EMBUTIR', 'EMB'), ('EMERGENCIA', 'EMERG'), ('ENCAMINHAMENTO', 'ENCAMIN'), ('ENCHIMENTO', 'ENCHIMEN'), ('ENGRAXADEIRA', 'ENGRAXAD'), ('ENGRENAGEM', 'ENGREN'), ('ENRIJECIDO', 'ENRIJ'), ('ENTRADA', 'ENTR'), ('ESCALIMETRO', 'ESCALIM'), ('ESCAPAMENTO', 'ESCAP'), ('ESCAVADEIRA', 'ESCAV'), ('ESCOAMENTO', 'ESCOAMEN'), ('ESFERA', 'ESF'), ('ESMALTE', 'ESM'), ('ESPACADOR (A)', 'ESPAC'), ('ESPACAMENTO', 'ESPACAMEN'), ('ESPAGUETE', 'ESPAG'), ('ESPALHADOR', 'ESPALHAD'), ('ESPECTROFOMETRO', 'ESPECTROFOM'), ('ESPIRAL', 'ESP'), ('ESPIROMETRO', 'ESPIROM'), ('ESQUERDO (A)', 'ESQ'), ('ESTABILIZADOR (A)', 'ESTAB'), ('ESTADIOMETRO', 'ESTADIOM'), ('ESTICADOR (A)', 'ESTICAD'), ('ESTRANGULADOR (A)', 'ESTRANG'), ('ESTRIADO', 'ESTRIAD'), ('EVAPORADOR (A)', 'EVAP'), ('EXCENTRICO (A)', 'EXC'), ('EXPANSAO', 'EXP'), ('EXPLOSIMETRO', 'EXPLOSIM'), ('EXTERNO (A)', 'EXT'), ('EXTREMIDADE', 'EXTREM'), ('EXTRUSÃO', 'EXTRUS'), ('FACE LISA (FLAT FACE)', 'FL'), ('FACE RANHURADO (RAISED FACE)', 'RF'), ('FECHADURA', 'FECH'), ('FECHAMENTO', 'FECHAM'), ('FEMEA', 'FEM'), ('FENDA', 'FEND'), ('FENDA SIMPLES', 'F SIMP'), ('FERRO CARBONO', 'FC'), ('FERRO FUNDIDO', 'FF'), ('FERRO MACIÇO', 'FM'), ('FERRO NODULAR', 'FN'), ('FERRO ZINCADO', 'FZ'), ('FERTILIZANTE', 'FERTILIZ'), ('FIBRA', 'FIBR'), ('FIBRA DE CARBONO', 'FIBR CARB'), ('FIXACAO', 'FIX'), ('FIXADOR (A)', 'FIXAD'), ('FLANGEADO', 'FLANG'), ('FLEXIVEL', 'FLEX'), ('FLUORESCENTE', 'FLUOR'), ('FLUXOMETRO', 'FLUXOM'), ('FOLHA', 'FOL'), ('FORJADO', 'FORJ'), ('FORMICIDA', 'FORMIC'), ('FREQUENCIA', 'FREQ'), ('FREQUENCIMETRO', 'FREQUENCIM'), ('FUNCIONAL', 'FUNCION'), ('FUROS', 'F'), ('GALVANIZADO', 'GALV'), ('GASOLINA', 'GASOL'), ('GAVETA', 'GAV'), ('GEOMECANICO', 'GEOMEC'), ('GIGABYTE', 'GB'), ('GIRATORIO (A)', 'GIRAT'), ('GOTEJADOR (A)', 'GOTEJ'), ('GRAUS', 'G'), ('GUILHOTINA', 'GUILH'), ('GUINDASTE', 'GUIND'), ('HALOGENA', 'HALOG'), ('HELICOIDAL', 'HELICOID'), ('HERBICIDA', 'HERB'), ('HEXAGONAL', 'HEXAG'), ('HIDRATANTE', 'HIDRAT'), ('HIDRAULICO (A)', 'HIDR'), ('HIDROMETRO', 'HIDROM'), ('HIDROSTATICA', 'HIDRO'), ('HIGROMETRO', 'HIGROM'), ('HODOMETRO', 'HODOM'), ('HOMOCINETICA', 'HOMOC'), ('HORIMETRO', 'HORIM'), ('HORIZONTAL', 'HOR'), ('ICAMENTO', 'ICAM'), ('IDENTIFICAÇÃO', 'IDENT'), ('ILUMINACAO', 'ILUM'), ('IMOBILIZADO', 'IMOB'), ('IMPACTO', 'IMPAC'), ('IMPERMEABILIZANTE', 'IMPERMEAB'), ('IMPLEMENTO', 'IMPLEMEN'), ('IMPRESSOR (A)', 'IMPRESS'), ('INCANDESCENTE', 'INCAND'), ('INCLINOMETRO', 'INCLINOM'), ('INCORPORADO', 'INCOR'), ('INCORPORADOR (A)', 'INCORP'), ('INDICADOR (A)', 'INDIC'), ('INDUSTRIAL', 'INDUSTR') ON CONFLICT (termo) DO UPDATE SET abreviacao = EXCLUDED.abreviacao;
INSERT INTO pdm_abreviacoes (termo, abreviacao) VALUES ('INDUSTRIALIZACAO', 'IND'), ('INDUTIVO', 'INDUT'), ('INFERIOR', 'INF'), ('INJETAVEL', 'INJ'), ('INSETICIDA', 'INSET'), ('INSTALAÇÃO', 'INST'), ('INSTRUMENTAÇÃO', 'INSTRUMENT'), ('INTERMEDIARIO (A)', 'INTERM'), ('INTERNO (A)', 'INT'), ('INTERRUPTOR', 'INTERRUP'), ('INTRINSECO', 'INTRINS'), ('INTRODUCAO', 'INTROD'), ('IRRIGACAO', 'IRRIG'), ('ISOLADOR (A)', 'ISOL'), ('JANELA', 'JAN'), ('JOGO', 'JG'), ('KNORR-BREMSE', 'KNORR B'), ('LADO DIREIRO', 'LD'), ('LADO ESQUERDO', 'LE'), ('LAMINADO', 'LAM'), ('LAMPADA', 'LAMP'), ('LANTERNA', 'LANT'), ('LATERAL', 'LAT'), ('LATITUDE', 'LATI'), ('LEVANTAMENTO', 'LEVANT'), ('LIBRAS', 'LB'), ('LIMITADOR', 'LIMITAD'), ('LIMPADOR', 'LIMPAD'), ('LIMPEZA', 'LIMP'), ('LISO', 'L'), ('LISO ROSCA', 'LR'), ('LOCAÇÃO', 'LOC'), ('LONGO', 'LONG'), ('LUBRIFICANTE', 'LUBR'), ('LUMINARIA', 'LUMIN'), ('MACHO', 'MACH'), ('MADEIRA', 'MAD'), ('MADEIRA COMPENSADA', 'MAD COMP'), ('MAGNET', 'MAGNET'), ('MANGUEIRA', 'MANG'), ('MANIPULADORA', 'MANIP'), ('MANOMETRO', 'MANOM'), ('MANOVACUOMETRO', 'MANOVACUOM'), ('MANUTENCAO', 'MANUT'), ('MAO FRANCESA', 'MAO FRANC'), ('MAQUINA', 'MAQ'), ('MARCADORA', 'MARC'), ('MASCARA FACIAL', 'MASCARA FAC'), ('MECANICO', 'MEC'), ('MEGABYTE', 'MB'), ('MEGOMETRO', 'MEGOM'), ('METÁLICA', 'METALI'), ('METRO', 'MT'), ('MICROMETRO', 'MICROM'), ('MILIMETROS', 'MM'), ('MINERAL', 'MIN'), ('MISTURADO (A)', 'MISTURAD'), ('MODULO (S)', 'MOD'), ('MOLDURA', 'MOLD'), ('MONOFASICO', '1F'), ('MONOPOLAR', '1POL'), ('MONTAGEM', 'MONTAG'), ('MOTORREDUTOR', 'MOTORR'), ('MOSQUITEIRO', 'MOSQUIT'), ('MULTIESTAGIO', 'MULTIESTAG'), ('MULTIFILTRO', 'MULTIF'), ('MULTIMETRO', 'MULTIM'), ('MULTIVAPOR', 'MULTIVAP'), ('NAVEGACAO', 'NAVEG'), ('NEGATIVO', 'NEG'), ('NERVURADA', 'NERV'), ('NITRILICA', 'NITRIL'), ('NUMERO', 'N'), ('OLEICO', 'OL'), ('ONDULADA', 'OND'), ('OPERACAO', 'OPERAC'), ('OPERADOR (A)', 'OPERAD'), ('OPTICO', 'OPT'), ('ORIENTACAO', 'ORIEN'), ('ORING', 'O'), ('ORIGINAL', 'ORIG'), ('PALHETA', 'PAL'), ('PAPEL HIGIENICO', 'PAPEL HIG'), ('PAQUIMETRO', 'PAQUIM'), ('PARABOLICA', 'PARAB'), ('PARABRISA', 'PARABR'), ('PARALAMA', 'PARAL'), ('PÁRA-CHOQUE', 'PARACHOQ'), ('PARAF FLANGEADO', 'PARAF FLG'), ('PARAFUSO', 'PARAF'), ('PARAFUSO CACAMBA', 'PARAF CACAMB'), ('PARAFUSO CANECA', 'PARAF CAN'), ('PARALELO (A)', 'PARAL'), ('PASSAGEM PLENA', 'PAP'), ('PASSAGEM REDUZIDA', 'PR'), ('PASSANTE', 'PASS'), ('PECAS', 'PEC'), ('PEQUENA', 'PEQ'), ('PERFURADA', 'PERF'), ('PERFURANTE', 'PERFURAN') ON CONFLICT (termo) DO UPDATE SET abreviacao = EXCLUDED.abreviacao;
INSERT INTO pdm_abreviacoes (termo, abreviacao) VALUES ('PERSONALIZDO (A)', 'PERSONALIZ'), ('PICADOR', 'PICAD'), ('PINGADEIRA', 'PINGAD'), ('PINTURA', 'PINT'), ('PIROMETRO', 'PIROM'), ('PLANTADEIRA', 'PLANTAD'), ('PLASTICO (A)', 'PLAST'), ('PLATAFORMA', 'PLATAF'), ('PLUVIOMETRO', 'PLUVIOM'), ('PNEUMATICO (A)', 'PNEUM'), ('POLEGADA', 'P'), ('POLIESTER', 'POE'), ('POLIESTIRENO', 'PS'), ('POLIESTIRENO EXPANDIDO (ISOPOR®)', 'EPS'), ('POLIETILENO', 'PE'), ('POLIETILENO DE ALTA DENSIDADE', 'PEAD'), ('POLIGONAL', 'POLIG'), ('POLIPROPILENO', 'PP'), ('POLITEREFTALATO', 'PET'), ('POLIURETANO', 'PU'), ('POLOS', 'POL'), ('PORTA', 'PORT'), ('POSICIONADOR (A)', 'POSICION'), ('POSITIVO', 'POSIT'), ('PONTEIRA', 'PONTEI'), ('POTENCIMETRO', 'POTENCIM'), ('POTENCIOMETRO', 'POTENCIO'), ('PRATELEIRA', 'PRAT'), ('PREFORMADO', 'PREF'), ('PREPARAR', 'PREP'), ('PRESSAO', 'PRESS'), ('PRESTACAO', 'PREST'), ('PRESSURIZADOR', 'PRESSUR'), ('PRINCIPAL', 'PRINC'), ('PRISIONEIRO', 'PRISION'), ('PROTECAO', 'PROTEC'), ('PROTETOR', 'PROTET'), ('PROTETORA', 'PROTE'), ('PULVERIZADOR (ÇÃO)', 'PULVERIZ'), ('PURIFICADOR', 'PURIF'), ('QUADRADO (A)', 'QUADR'), ('QUIMICA', 'QUIMIC'), ('RAIO CURTO', 'RC'), ('RAIO LONGO', 'RL'), ('RAPIDO', 'RAP'), ('RASPADOR (A)', 'RASP'), ('RECAMBIAVEL', 'RECAMB'), ('RECARREGAVEL', 'RECARREG'), ('RECEPTOR (A)', 'RECEPT'), ('RECICLAGEM', 'RECICL'), ('RECOLHEDOR', 'RECOLHED'), ('REDONDO (A)', 'REDOND'), ('REDUCAO', 'RED'), ('REDUTOR (A)', 'REDUT'), ('REFORCADO (A)', 'REF'), ('REFRATARIO', 'REFRAT'), ('REFLETIVO (A)', 'REFLET'), ('REFRIGERADO (A)', 'REFRIG'), ('REGISTRO', 'REGIS'), ('REGULADOR (A)', 'REGULAD'), ('REGULAGEM', 'REGUL'), ('REGULAVEL', 'REG'), ('REMOVEDOR', 'REMOVED'), ('REMOVIVEL', 'REMOV'), ('RESERVATORIO', 'RESERV'), ('RESPIRADOR', 'RESPIRAD'), ('RETANGULAR', 'RETANG'), ('RETENCAO', 'RETENC'), ('RETENTOR', 'RETENT'), ('RETORNO', 'RETOR'), ('RETRATIL', 'RETRAT'), ('RETRILHA', 'RETRIL'), ('RETROVISOR', 'RETROV'), ('REUTILIZACAO', 'REUTILIZ'), ('REVENDA', 'REV'), ('REVERSORA (A)', 'REVERS'), ('REVESTIMENTO', 'REVEST'), ('RIGIDO (A)', 'RIG'), ('ROLAMENTO', 'ROL'), ('ROSCA', 'R'), ('ROSCA INTEIRA', 'RI'), ('ROSCA INTERNA', 'INT'), ('ROSCA PARCIAL', 'RP'), ('ROSCA SEM FIM', 'R S FIM'), ('ROSCA SOBERBA', 'R SOB'), ('ROSCA TOTAL', 'RT'), ('ROSQUEADO', 'ROSQ'), ('ROTAMETRO', 'ROTAM'), ('ROTATIVO (A)', 'ROTAT'), ('SANFONADO (A)', 'SANF'), ('SANITARIO', 'SANIT'), ('SECADOR', 'SECAD'), ('SECCIONADORA', 'SECCION'), ('SEDIMENTACAO', 'SEDIMEN'), ('SEDIMENTADO', 'SEDIMEN'), ('SEGMOMETRO', 'SEGMOM'), ('SEGURANCA', 'SEG'), ('SEMENTE', 'SEM'), ('SEM', 'S'), ('SEM CABECA', 'S CAB') ON CONFLICT (termo) DO UPDATE SET abreviacao = EXCLUDED.abreviacao;
INSERT INTO pdm_abreviacoes (termo, abreviacao) VALUES ('SEM COSTURA', 'SC'), ('SEM FIM', 'S FIM'), ('SEM ROSCA', 'SR'), ('SEPARADOR (A)', 'SEP'), ('SERVICO', 'SERV'), ('SEXTAVADO (A)', 'SEXT'), ('SIFONADO (A)', 'SIFON'), ('SILENCIADOR', 'SILENCIAD'), ('SILENCIOSO', 'SILENC'), ('SIMPLES', 'SIMPL'), ('SINALIZADOR (A)', 'SINALIZ'), ('SINCRONIZADOR (A)', 'SINCRONIZ'), ('SINTERIZADO', 'SINTERIZ'), ('SINTETICO (A)', 'SINT'), ('SOBREPOR', 'SOBR'), ('SOBRESSALENTE', 'SOBRESS'), ('SOLDAVEL', 'SOLD'), ('SOPRADOR', 'SOPRAD'), ('SOQUETE', 'SOQ'), ('STANDARD', 'STAND'), ('SUBSOLADO (A)', 'SUBSOLAD'), ('SULCADOR', 'SULCAD'), ('SUPERIOR', 'SUP'), ('SUPLEMENTO', 'SUPLEMEN'), ('SUSPENSAO', 'SUSP'), ('SUSTENTACAO', 'SUSTEN'), ('TACOMETRO', 'TACOM'), ('TALISCADA', 'TALIS'), ('TALHADEIRA', 'TALHAD'), ('TECLA', 'TECL'), ('TEFLON', 'TEF'), ('TEMPERADO', 'TEMP'), ('TEMPERATURA', 'TEMPERAT'), ('TEMPO', 'T'), ('TEMPORIZADOR (A)', 'TEMPORIZ'), ('TERABYTE', 'TB'), ('TERMICO', 'TERMIC'), ('TERMINAL', 'TERM'), ('TERMODINAMICO', 'TD'), ('TERMOMAGNETICO', 'TERMOMAG'), ('TERMOMETRO', 'TERMOM'), ('TINTA ACRILICA', 'TINTA ACR'), ('TOM', 'TOM'), ('TORNEIRA', 'TORN'), ('TORQUIMETRO', 'TORQUIM'), ('TOUCH SCREEN', 'T SCREEN'), ('TRAMBULADOR', 'TRAMB'), ('TRANCADA', 'TRANC'), ('TRANSDUTOR', 'TRANSD'), ('TRANSFERENCIA', 'TRANSFEREN'), ('TRANSFORMADOR', 'TRANSF'), ('TRANSLUCIDA', 'TRANSL'), ('TRANSMISSAO', 'TRANSMIS'), ('TRANSMISSOR (A)', 'TRANSM'), ('TRANSPARENTE', 'TRANSP'), ('TRANSPORTADOR (A)', 'TRANSPOR'), ('TRAPEZOIDAL', 'TRAPEZ'), ('TRASEIRO', 'TRAS'), ('TRASMISSOR (A)', 'TRANSM'), ('TRATAMENTO', 'TRATAM'), ('TRATOMETRO', 'TRATOM'), ('TRAVAMENTO', 'TRAVAM'), ('TRAVANTE (VADO)', 'TRAV'), ('TREFILADO (A)', 'TREF'), ('TRIFASICO', '3F'), ('TRIPATIDA', 'TRIP'), ('TRIPLA', 'TRIPL'), ('TRIPOLAR', '3POL'), ('TUBULAR', 'TUB'), ('ULTRAVIOLETA', 'UV'), ('UNIDIRECIONAL', 'UNIDIR'), ('UNIPOLAR', 'UNIP'), ('UNIVERSAL', 'UNIV'), ('USINAGEM', 'USINAG'), ('VACUOMETRO', 'VACUOM'), ('VALVULA', 'VALV'), ('VANEZIANA', 'VENEZ'), ('VAPOR MERCURIO', 'VAP MERCURIO'), ('VAPOR METALICO', 'VAP MET'), ('VAPOR SODIO', 'VAP SODIO'), ('VARIADOR', 'VARIAD'), ('VEDACAO', 'VEDAC'), ('VEDADOR (A)', 'VEDAD'), ('VEICULAR', 'VEIC'), ('VELOCIDADE', 'VELOC'), ('VELOCIMETRO', 'VELOCIM'), ('VETERINARIO', 'VET'), ('VENTILACAO', 'VENTILAC'), ('VENTILADO', 'VETILAD'), ('VENTILADOR', 'VENT'), ('VERTICAL', 'VERT'), ('VIBRACAO', 'VIBRAC'), ('VIBRADOR (A)', 'VIBR'), ('VIDRO', 'VIDR'), ('VINIL', 'VIN'), ('VOLTAGEM', 'V'), ('VOLTIMETRO', 'VOLTIM'), ('VULCANIZADOR (A)', 'VULCANIZ'), ('WATTS', 'W'), ('ZINCADO', 'ZINC') ON CONFLICT (termo) DO UPDATE SET abreviacao = EXCLUDED.abreviacao;
INSERT INTO pdm_abreviacoes (termo, abreviacao) VALUES ('AMARELO', 'AMAR'), ('AZUL', 'AZU'), ('AZUL MARINHO', 'AZU MARIN'), ('BEGE', 'BG'), ('BRANCO', 'BR'), ('CINZA', 'CZ'), ('INCOLOR', 'INC'), ('LARANJA', 'LAR'), ('MARFIM', 'MARF'), ('MARRON', 'MARR'), ('PRETO', 'PT'), ('VERDE', 'VD'), ('VERMELHO', 'VM') ON CONFLICT (termo) DO UPDATE SET abreviacao = EXCLUDED.abreviacao;
