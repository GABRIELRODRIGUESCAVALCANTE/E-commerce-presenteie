// Traduz os códigos de erro mais comuns do Better Auth para mensagens em português
const MESSAGES = {
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha incorretos.',
  USER_ALREADY_EXISTS: 'Já existe uma conta com este e-mail. Faça login.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Já existe uma conta com este e-mail. Faça login.',
  PASSWORD_TOO_SHORT: 'A senha deve ter no mínimo 8 caracteres.',
  PASSWORD_TOO_LONG: 'A senha é longa demais.',
  INVALID_EMAIL: 'Informe um e-mail válido.',
  INVALID_TOKEN: 'Este link é inválido ou expirou. Solicite um novo.',
  EMAIL_NOT_VERIFIED: 'Confirme seu e-mail antes de entrar.',
  TOO_MANY_REQUESTS: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
};

export function authErrorMessage(error, fallback = 'Não foi possível concluir. Tente novamente.') {
  if (!error) return fallback;
  if (error.status === 429) return MESSAGES.TOO_MANY_REQUESTS;
  return MESSAGES[error.code] || error.message || fallback;
}

/** Aceita apenas caminhos internos como destino após o login (evita redirecionamento aberto). */
export function safeRedirect(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}
