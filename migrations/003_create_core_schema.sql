-- Migration: 003_create_core_schema.sql
-- Descrição: Garante a existência das tabelas principais da loja (categorias, produtos, pedidos e itens).
-- Todas as instruções são idempotentes (IF NOT EXISTS): em bancos já existentes nada é alterado,
-- e em instalações novas (ex.: Docker) o schema necessário é criado automaticamente.

CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT
);

CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
    estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
    imagem_url TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    usuario_id TEXT,
    nome_cliente VARCHAR(100) NOT NULL,
    endereco VARCHAR(200),
    cidade VARCHAR(100),
    cep VARCHAR(20),
    total NUMERIC(10, 2) NOT NULL,
    telefone VARCHAR(30),
    metodo_entrega VARCHAR(20) NOT NULL DEFAULT 'retirada',
    metodo_pagamento VARCHAR(30) NOT NULL DEFAULT 'não informado',
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    data_pedido TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS itens_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(10, 2) NOT NULL
);

-- Índices para as consultas mais frequentes (vitrine, histórico de pedidos e itens)
CREATE INDEX IF NOT EXISTS idx_produtos_categoria_id ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_id ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON itens_pedido(pedido_id);
