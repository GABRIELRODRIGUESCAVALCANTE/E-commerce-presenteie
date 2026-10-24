import { api } from './client';

// Catálogo
export const getProdutos = (params, config) =>
  api.get('/produtos', { params, ...config }).then((r) => r.data);
export const getProduto = (id, config) => api.get(`/produtos/${id}`, config).then((r) => r.data);
export const getCategorias = () => api.get('/categorias').then((r) => r.data);

// Conta e pedidos
export const getMe = () => api.get('/me').then((r) => r.data);
export const criarPedido = (payload) => api.post('/pedidos', payload).then((r) => r.data);
export const getMeusPedidos = (usuarioId) => api.get(`/meus-pedidos/${usuarioId}`).then((r) => r.data);

// Verificação de e-mail (OTP) no cadastro
export const enviarCodigoVerificacao = (email) =>
  api.post('/auth/send-verification-code', { email }).then((r) => r.data);
export const verificarCodigo = (email, code) =>
  api.post('/auth/verify-code', { email, code }).then((r) => r.data);

// Administração
export const getPedidosAdmin = () => api.get('/pedidos').then((r) => r.data);
export const atualizarStatusPedido = (id, status) =>
  api.patch(`/pedidos/${id}/status`, { status }).then((r) => r.data);
export const atualizarEstoque = (id, estoque) =>
  api.patch(`/produtos/${id}/estoque`, { estoque }).then((r) => r.data);
export const excluirProduto = (id) => api.delete(`/produtos/${id}`).then((r) => r.data);
export const criarProduto = (formData) => api.post('/produtos', formData).then((r) => r.data);
export const criarCategoria = (nome) => api.post('/categorias', { nome }).then((r) => r.data);
