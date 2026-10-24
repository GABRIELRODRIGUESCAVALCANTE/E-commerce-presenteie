import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 20000,
});

/**
 * Extrai uma mensagem amigável de erros do axios / back-end.
 * O back-end responde com `error` (padrão), `erro` (rotas antigas) ou `message` (Better Auth).
 */
export function getErrorMessage(err, fallback = 'Algo deu errado. Tente novamente.') {
  const data = err?.response?.data;
  if (data && typeof data === 'object') {
    const message = data.error || data.erro || data.message;
    if (message) return message;
  }
  if (err?.response?.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (err?.code === 'ECONNABORTED') return 'A conexão demorou demais. Tente novamente.';
  if (err?.request && !err?.response) return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  return fallback;
}
