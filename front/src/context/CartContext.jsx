import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CartContext } from './contexts';
import { useToast } from '../hooks/useToast';

const STORAGE_KEY = 'carrinhoPresenteie';

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter((item) => item && item.id && item.quantidade > 0) : [];
  } catch {
    return [];
  }
}

// Guarda apenas os campos usados pelo carrinho (o back-end recalcula preço e estoque no checkout)
const toCartItem = (produto, quantidade) => ({
  id: produto.id,
  nome: produto.nome,
  preco: produto.preco,
  imagem_url: produto.imagem_url || produto.imagem || null,
  estoque: produto.estoque,
  quantidade,
});

export function CartProvider({ children }) {
  const { showToast } = useToast();
  const [items, setItems] = useState(loadCart);
  const [isOpen, setIsOpen] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Armazenamento indisponível (modo privado): o carrinho segue funcionando na sessão atual
    }
  }, [items]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback((produto, quantidade = 1, { silent = false } = {}) => {
    const existente = itemsRef.current.find((item) => item.id === produto.id);
    const qtdAtual = existente ? existente.quantidade : 0;
    const estoque = Number(produto.estoque);

    if (Number.isFinite(estoque) && qtdAtual + quantidade > estoque) {
      showToast(
        qtdAtual > 0
          ? `Você já tem ${qtdAtual} no carrinho. Temos apenas ${estoque} unidade(s) disponível(is).`
          : `Temos apenas ${estoque} unidade(s) disponível(is).`,
        'warning'
      );
      return false;
    }

    setItems((prev) =>
      existente
        ? prev.map((item) =>
            item.id === produto.id ? { ...toCartItem(produto, item.quantidade + quantidade) } : item
          )
        : [...prev, toCartItem(produto, quantidade)]
    );

    if (!silent) {
      showToast(`"${produto.nome}" foi adicionado ao carrinho.`, 'success', {
        action: { label: 'Ver carrinho', onClick: () => setIsOpen(true) },
      });
    }
    return true;
  }, [showToast]);

  const removeItem = useCallback((id) => {
    const index = itemsRef.current.findIndex((item) => item.id === id);
    if (index === -1) return;
    const removido = itemsRef.current[index];
    setItems((prev) => prev.filter((item) => item.id !== id));
    showToast(`"${removido.nome}" foi removido do carrinho.`, 'info', {
      action: {
        label: 'Desfazer',
        onClick: () =>
          setItems((prev) => {
            if (prev.some((item) => item.id === removido.id)) return prev;
            const next = [...prev];
            next.splice(Math.min(index, next.length), 0, removido);
            return next;
          }),
      },
    });
  }, [showToast]);

  const updateQuantity = useCallback((id, quantidade) => {
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item) return;
    if (quantidade <= 0) {
      removeItem(id);
      return;
    }
    if (Number.isFinite(Number(item.estoque)) && quantidade > item.estoque) {
      showToast(`Limite de estoque atingido (${item.estoque} disponível(is)).`, 'warning');
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantidade } : i)));
  }, [removeItem, showToast]);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((total, item) => total + item.quantidade, 0);
    const subtotal = items.reduce((total, item) => total + Number(item.preco) * item.quantidade, 0);
    return { items, count, subtotal, isOpen, openCart, closeCart, addItem, removeItem, updateQuantity, clearCart };
  }, [items, isOpen, openCart, closeCart, addItem, removeItem, updateQuantity, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
