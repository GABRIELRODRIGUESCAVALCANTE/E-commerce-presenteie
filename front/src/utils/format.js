export const formatPreco = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const STATUS_LABELS = {
  pendente: 'Pendente',
  em_separacao: 'Em Separação',
  enviado: 'Enviado',
  entregue: 'Entregue',
};

export const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_separacao', label: 'Em Separação' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregue', label: 'Entregue' },
];

export const PAYMENT_LABELS = {
  'cartão': 'Cartão',
  pix: 'PIX',
  'espécie': 'Dinheiro',
  'não informado': 'Não informado',
};

export const PLACEHOLDER_IMG = '/placeholder.svg';

/**
 * Gera a URL da imagem otimizada. Imagens do Cloudinary recebem formato/qualidade automáticos
 * e largura máxima, reduzindo bastante o peso das fotos enviadas pelo painel.
 */
export function imageUrl(url, width = 600) {
  if (!url) return PLACEHOLDER_IMG;
  if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('/upload/f_auto')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`);
  }
  return url;
}

export function imageSrcSet(url, width) {
  if (!url || !url.includes('res.cloudinary.com')) return undefined;
  return `${imageUrl(url, width)} 1x, ${imageUrl(url, width * 2)} 2x`;
}

export function productImage(produto) {
  return produto?.imagem_url || produto?.imagem || null;
}

export function slugify(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export const productPath = (produto) => `/produto/${produto.id}/${slugify(produto.nome)}`;

/** Máscara de telefone brasileiro: (85) 99999-0000 */
export function maskTelefone(valor) {
  const d = String(valor).replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const telefoneValido = (valor) => {
  const len = String(valor).replace(/\D/g, '').length;
  return len >= 10 && len <= 11;
};

export const primeiroNome = (nome) => (nome ? String(nome).trim().split(' ')[0] : '');
