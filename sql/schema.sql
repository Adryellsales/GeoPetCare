-- ============================================================
--  GEO PET CARE — Schema MySQL
--  Baseado no Documento de Requisitos (Março 2026)
-- ============================================================

CREATE DATABASE IF NOT EXISTS geopetcare
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE geopetcare;

-- ── USUÁRIOS DO SISTEMA ───────────────────────────────────────
CREATE TABLE usuarios (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  nome          VARCHAR(150)    NOT NULL,
  email         VARCHAR(150)    NOT NULL UNIQUE,
  senha_hash    VARCHAR(255)    NOT NULL,
  perfil        ENUM('admin','veterinario','adotante','doador','voluntario') NOT NULL DEFAULT 'adotante',
  ativo         TINYINT(1)      NOT NULL DEFAULT 1,
  criado_em     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_email (email),
  INDEX idx_perfil (perfil)
) ENGINE=InnoDB;

-- ── ANIMAIS ──────────────────────────────────────────────────
-- Entidade principal conforme Dicionário de Dados (Seção 7)
CREATE TABLE animais (
  id                  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  codigo              VARCHAR(20)   NOT NULL UNIQUE,          -- Ex: GEO-001
  microchip           VARCHAR(50)   NULL UNIQUE,
  nome                VARCHAR(100)  NOT NULL,
  especie             ENUM('cachorro','gato','outro') NOT NULL DEFAULT 'cachorro',
  raca                VARCHAR(100)  NULL DEFAULT 'SRD',
  idade_estimada      VARCHAR(50)   NULL,
  data_resgate        DATE          NOT NULL,

  -- Triagem médica (RF01)
  classificacao_risco ENUM('critico','grave','medio','baixo') NOT NULL,
  laudo_observacoes   TEXT          NULL,

  -- Características para o match (RF07)
  nivel_energia       ENUM('baixo','moderado','alto')         NOT NULL DEFAULT 'moderado',
  porte               ENUM('pequeno','medio','grande')        NOT NULL,
  castrado            TINYINT(1)    NOT NULL DEFAULT 0,
  vacinado            TINYINT(1)    NOT NULL DEFAULT 0,
  necessidades_especiais TINYINT(1) NOT NULL DEFAULT 0,
  compativel_criancas TINYINT(1)   NOT NULL DEFAULT 1,
  compativel_outros_animais TINYINT(1) NOT NULL DEFAULT 1,

  -- Status (RF01, RN01)
  status_adocao       ENUM('disponivel','em_processo','adotado','lar_temporario') NOT NULL DEFAULT 'disponivel',

  -- RN01: bloqueio automático - animais críticos/graves não aparecem no catálogo
  -- Calculado via VIEW + regra na aplicação

  -- RF03: "Cachorro Invisível" — calculado por dias desde data_resgate
  -- Tag gerada automaticamente quando dias_sede >= 90

  cadastrado_por      INT UNSIGNED  NULL,
  criado_em           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_codigo (codigo),
  INDEX idx_risco (classificacao_risco),
  INDEX idx_status (status_adocao),
  FOREIGN KEY (cadastrado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── FOTOS DOS ANIMAIS ─────────────────────────────────────────
CREATE TABLE animal_fotos (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  animal_id  INT UNSIGNED NOT NULL,
  url        VARCHAR(500) NOT NULL,
  principal  TINYINT(1)   NOT NULL DEFAULT 0,
  criado_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (animal_id) REFERENCES animais(id) ON DELETE CASCADE,
  INDEX idx_animal (animal_id)
) ENGINE=InnoDB;

-- ── ADOTANTES ────────────────────────────────────────────────
-- Campos do Quiz de Match (RF06) baseados no Dicionário de Dados
CREATE TABLE adotantes (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id            INT UNSIGNED NOT NULL UNIQUE,
  tipo_moradia          ENUM('casa_com_quintal','apartamento','casa_sem_quintal') NOT NULL,
  tamanho_espaco_m2     INT UNSIGNED NULL,
  possui_criancas       TINYINT(1)   NOT NULL DEFAULT 0,
  possui_outros_animais TINYINT(1)   NOT NULL DEFAULT 0,
  tempo_livre_diario_h  TINYINT UNSIGNED NOT NULL DEFAULT 4,  -- horas/dia disponíveis
  experiencia_previa    ENUM('iniciante','intermediario','avancado') NOT NULL DEFAULT 'iniciante',
  preferencia_especie   ENUM('cachorro','gato','qualquer')   NOT NULL DEFAULT 'qualquer',
  preferencia_porte     ENUM('pequeno','medio','grande','qualquer') NOT NULL DEFAULT 'qualquer',
  preferencia_energia   ENUM('baixo','moderado','alto','qualquer')  NOT NULL DEFAULT 'qualquer',
  criado_em             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── VOLUNTÁRIOS / LARES TEMPORÁRIOS ──────────────────────────
-- RF02: Upload de documentos + checklist de aprovação
CREATE TABLE voluntarios (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id            INT UNSIGNED NOT NULL UNIQUE,
  cpf                   VARCHAR(14)  NOT NULL UNIQUE,
  tipo_moradia          ENUM('casa_com_quintal','apartamento','casa_sem_quintal') NOT NULL,
  status_validacao      ENUM('pendente','em_analise','aprovado','aguardando_correcao','reprovado') NOT NULL DEFAULT 'pendente',

  -- Documentos (RNF04: armazenados com criptografia no storage)
  doc_rg_url            VARCHAR(500) NULL,
  doc_comprovante_url   VARCHAR(500) NULL,
  doc_antecedentes_url  VARCHAR(500) NULL,

  -- Checklist do administrador (UC02)
  check_rg_ok           TINYINT(1)   NOT NULL DEFAULT 0,
  check_comprovante_ok  TINYINT(1)   NOT NULL DEFAULT 0,
  check_antecedentes_ok TINYINT(1)   NOT NULL DEFAULT 0,
  check_investigacao_ok TINYINT(1)   NOT NULL DEFAULT 0,

  validado_por          INT UNSIGNED NULL,
  motivo_reprovacao     TEXT         NULL,
  criado_em             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id)   REFERENCES usuarios(id)  ON DELETE CASCADE,
  FOREIGN KEY (validado_por) REFERENCES usuarios(id)  ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── LARES TEMPORÁRIOS (relação animal ↔ voluntário) ──────────
CREATE TABLE lares_temporarios (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  animal_id    INT UNSIGNED NOT NULL,
  voluntario_id INT UNSIGNED NOT NULL,
  data_entrada DATE         NOT NULL,
  data_saida   DATE         NULL,
  ativo        TINYINT(1)   NOT NULL DEFAULT 1,
  observacoes  TEXT         NULL,
  criado_em    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (animal_id)    REFERENCES animais(id)     ON DELETE CASCADE,
  FOREIGN KEY (voluntario_id) REFERENCES voluntarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── MATCHES DE ADOÇÃO ────────────────────────────────────────
-- RF07: Resultado do algoritmo de IA
CREATE TABLE matches_adocao (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  adotante_id   INT UNSIGNED    NOT NULL,
  animal_id     INT UNSIGNED    NOT NULL,
  score         DECIMAL(5,2)    NOT NULL,  -- 0.00 a 100.00
  detalhes_json JSON            NULL,      -- breakdown por critério
  status        ENUM('sugerido','interesse','entrevista','aprovado','recusado') NOT NULL DEFAULT 'sugerido',
  criado_em     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_match (adotante_id, animal_id),
  INDEX idx_score (score DESC),
  FOREIGN KEY (adotante_id) REFERENCES adotantes(id) ON DELETE CASCADE,
  FOREIGN KEY (animal_id)   REFERENCES animais(id)   ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── DOAÇÕES ──────────────────────────────────────────────────
-- RF05: Módulo de doações (RNF05: sem dados de cartão no BD)
CREATE TABLE doacoes (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id       INT UNSIGNED NULL,  -- NULL = doação anônima
  valor            DECIMAL(10,2) NOT NULL,
  metodo           ENUM('pix','cartao','boleto') NOT NULL,
  recorrente       TINYINT(1)   NOT NULL DEFAULT 0,
  status           ENUM('pendente','confirmado','falhou','cancelado') NOT NULL DEFAULT 'pendente',
  gateway_id       VARCHAR(255) NULL,  -- ID retornado pelo gateway (RNF05)
  recibo_numero    VARCHAR(50)  NULL,
  criado_em        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmado_em    DATETIME     NULL,
  PRIMARY KEY (id),
  INDEX idx_status (status),
  INDEX idx_usuario (usuario_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── VIEW: Catálogo Público (aplica RN01 automaticamente) ──────
CREATE OR REPLACE VIEW vw_catalogo_publico AS
SELECT
  a.id,
  a.codigo,
  a.nome,
  a.especie,
  a.raca,
  a.porte,
  a.nivel_energia,
  a.castrado,
  a.vacinado,
  a.necessidades_especiais,
  a.compativel_criancas,
  a.compativel_outros_animais,
  a.data_resgate,
  DATEDIFF(CURDATE(), a.data_resgate) AS dias_sede,
  -- RF03: tag "invisível" automática
  CASE WHEN DATEDIFF(CURDATE(), a.data_resgate) >= 90 THEN 1 ELSE 0 END AS invisivel,
  f.url AS foto_principal
FROM animais a
LEFT JOIN animal_fotos f ON f.animal_id = a.id AND f.principal = 1
WHERE
  a.status_adocao = 'disponivel'
  -- RN01: bloqueia crítico e grave do catálogo público
  AND a.classificacao_risco NOT IN ('critico','grave');

-- ── VIEW: Dashboard Transparência (RF04) ─────────────────────
CREATE OR REPLACE VIEW vw_dashboard_transparencia AS
SELECT
  (SELECT COUNT(*) FROM animais WHERE status_adocao != 'adotado') AS animais_ativos,
  (SELECT COUNT(*) FROM animais WHERE status_adocao = 'disponivel'
     AND classificacao_risco NOT IN ('critico','grave'))          AS disponiveis_adocao,
  (SELECT COUNT(*) FROM animais WHERE status_adocao = 'adotado') AS total_adotados,
  (SELECT COUNT(*) FROM animais
     WHERE DATEDIFF(CURDATE(), data_resgate) >= 90
       AND status_adocao != 'adotado')                            AS cachorros_invisiveis,
  (SELECT COUNT(*) FROM voluntarios WHERE status_validacao = 'aprovado') AS lares_ativos,
  (SELECT COALESCE(SUM(valor),0) FROM doacoes WHERE status = 'confirmado'
     AND MONTH(confirmado_em) = MONTH(CURDATE())
     AND YEAR(confirmado_em)  = YEAR(CURDATE()))                  AS arrecadado_mes,
  (SELECT COALESCE(SUM(valor),0) FROM doacoes WHERE status = 'confirmado') AS arrecadado_total;

-- ── SEED: Usuário admin padrão ────────────────────────────────
-- Senha: password (trocar em produção)
INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES
('Administrador GEO', 'admin@geopetcare.org',
 '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password
 'admin');
