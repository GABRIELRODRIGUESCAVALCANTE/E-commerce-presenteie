import { useEffect, useState } from 'react';
import { getCategorias } from '../api';

// Cache em memória compartilhado entre cabeçalho, vitrine e painel (categorias mudam raramente)
let cache = null;
let pending = null;

export function invalidateCategorias() {
  cache = null;
  pending = null;
}

export function useCategorias() {
  const [categorias, setCategorias] = useState(cache || []);

  useEffect(() => {
    if (cache) return;
    let ativo = true;
    pending = pending || getCategorias().then((data) => (cache = Array.isArray(data) ? data : []));
    pending
      .then((data) => ativo && setCategorias(data))
      .catch(() => {
        pending = null;
      });
    return () => {
      ativo = false;
    };
  }, []);

  return categorias;
}
