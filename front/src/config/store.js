// Informações da loja exibidas em várias telas (contato, retirada e pagamento)
export const STORE = {
  name: 'Presenteie',
  whatsappNumber: '5585992251640',
  whatsappDisplay: '(85) 99225-1640',
  mapsUrl: 'https://maps.app.goo.gl/bJLVbX5qwyjFf67A9',
};

export const whatsappLink = (message = 'Olá! Gostaria de tirar algumas dúvidas sobre os produtos da Presenteie.') =>
  `https://wa.me/${STORE.whatsappNumber}?text=${encodeURIComponent(message)}`;

export const PAYMENT_METHODS = [
  { value: 'cartão', label: 'Cartão', description: 'Crédito ou débito' },
  { value: 'pix', label: 'PIX', description: 'Pagamento instantâneo' },
  { value: 'espécie', label: 'Dinheiro', description: 'Pagamento em espécie' },
];
