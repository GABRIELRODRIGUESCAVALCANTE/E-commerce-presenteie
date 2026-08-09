export const formatPreco = (valor) =>
  Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

export const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1549465220-1a50b2538e03?w=400&h=400&fit=crop';
