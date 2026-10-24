import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icon';
import { Field, Select } from '../../components/Field';
import { criarProduto, criarCategoria } from '../../api';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { useCategorias, invalidateCategorias } from '../../hooks/useCategorias';
import { formatPreco } from '../../utils/format';

const MAX_IMAGE_MB = 5;
const INITIAL = { nome: '', preco: '', estoque: '10', descricao: '', categoriaId: '' };

export default function ProductForm({ onCreated }) {
  const { showToast } = useToast();
  const categoriasCache = useCategorias();
  const [categoriasExtras, setCategoriasExtras] = useState([]);
  const categorias = [...categoriasCache, ...categoriasExtras.filter((c) => !categoriasCache.some((x) => x.id === c.id))];

  const [form, setForm] = useState(INITIAL);
  const [imagem, setImagem] = useState(null);
  const [preview, setPreview] = useState('');
  const [errors, setErrors] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [criandoCategoria, setCriandoCategoria] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!imagem) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(imagem);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imagem]);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const handleImagem = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      setErrors((er) => ({ ...er, imagem: 'Use uma imagem JPG, PNG, WEBP ou GIF.' }));
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setErrors((er) => ({ ...er, imagem: `A imagem deve ter no máximo ${MAX_IMAGE_MB}MB.` }));
      e.target.value = '';
      return;
    }
    setErrors((er) => ({ ...er, imagem: undefined }));
    setImagem(file);
  };

  const validar = () => {
    const next = {};
    if (!form.nome.trim()) next.nome = 'Informe o nome do produto.';
    const preco = Number(String(form.preco).replace(',', '.'));
    if (!form.preco || !Number.isFinite(preco) || preco < 0) next.preco = 'Informe um preço válido.';
    const estoque = Number(form.estoque);
    if (form.estoque === '' || !Number.isInteger(estoque) || estoque < 0) next.estoque = 'Informe um número inteiro (0 ou mais).';
    if (!imagem) next.imagem = 'Selecione uma imagem do produto.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const adicionarCategoria = async () => {
    const nome = novaCategoria.trim();
    if (!nome) return;
    setCriandoCategoria(true);
    try {
      const categoria = await criarCategoria(nome);
      invalidateCategorias();
      setCategoriasExtras((prev) => [...prev, categoria]);
      setForm((f) => ({ ...f, categoriaId: String(categoria.id) }));
      setNovaCategoria('');
      showToast(`Categoria "${categoria.nome}" criada!`, 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao criar categoria.'), 'error');
    } finally {
      setCriandoCategoria(false);
    }
  };

  const cadastrarProduto = async (e) => {
    e.preventDefault();
    if (!validar()) return;
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append('nome', form.nome.trim());
      formData.append('preco', String(form.preco).replace(',', '.'));
      formData.append('descricao', form.descricao.trim());
      formData.append('estoque', form.estoque);
      formData.append('categoria_id', form.categoriaId);
      formData.append('imagem', imagem);
      await criarProduto(formData);
      showToast('Produto cadastrado com sucesso!', 'success', onCreated ? { action: { label: 'Ver estoque', onClick: onCreated } } : {});
      setForm(INITIAL);
      setImagem(null);
      setErrors({});
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao cadastrar produto.'), 'error');
    } finally {
      setEnviando(false);
    }
  };

  const precoNumero = Number(String(form.preco).replace(',', '.'));

  return (
    <form onSubmit={cadastrarProduto} className="product-form" noValidate>
      <div className="card card--padded form-stack">
        <h2 className="checkout-section__title">Informações do produto</h2>
        <Field label="Nome do produto" error={errors.nome}>
          <input className="input" value={form.nome} onChange={set('nome')} maxLength={150} required />
        </Field>
        <div className="form-grid">
          <Field label="Preço (R$)" error={errors.preco} hint={form.preco && Number.isFinite(precoNumero) ? `Exibido como ${formatPreco(precoNumero)}` : 'Ex.: 99,90'}>
            <input className="input" inputMode="decimal" value={form.preco} onChange={set('preco')} placeholder="0,00" required />
          </Field>
          <Field label="Estoque inicial" error={errors.estoque}>
            <input className="input" type="number" min="0" step="1" inputMode="numeric" value={form.estoque} onChange={set('estoque')} required />
          </Field>
        </div>
        <Field label="Categoria" optional>
          <Select value={form.categoriaId} onChange={set('categoriaId')}>
            <option value="">Sem categoria</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </Field>
        <div className="inline-create">
          <label htmlFor="nova-categoria" className="sr-only">Nova categoria</label>
          <input
            id="nova-categoria"
            className="input input--sm"
            placeholder="Criar nova categoria"
            value={novaCategoria}
            maxLength={100}
            onChange={(e) => setNovaCategoria(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarCategoria(); } }}
          />
          <button type="button" className="btn btn--secondary btn--sm" onClick={adicionarCategoria} disabled={!novaCategoria.trim() || criandoCategoria}>
            <Icon name="plus" size={16} /> {criandoCategoria ? 'Criando...' : 'Adicionar'}
          </button>
        </div>
        <Field label="Descrição" optional hint={`${form.descricao.length}/2000 caracteres`}>
          <textarea className="textarea" value={form.descricao} onChange={set('descricao')} rows={5} maxLength={2000} placeholder="Conte o que torna este presente especial" />
        </Field>
      </div>

      <div className="card card--padded form-stack">
        <h2 className="checkout-section__title">Imagem</h2>
        <Field label="Foto do produto" error={errors.imagem} hint={`JPG, PNG, WEBP ou GIF — até ${MAX_IMAGE_MB}MB.`}>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImagem} className="file-input" />
        </Field>
        <div className="image-preview">
          {preview ? <img src={preview} alt="Pré-visualização da imagem do produto" /> : (
            <span className="image-preview__empty"><Icon name="image" size={32} /> Pré-visualização</span>
          )}
        </div>
        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={enviando}>
          {enviando ? 'Cadastrando...' : 'Cadastrar produto'}
        </button>
      </div>
    </form>
  );
}
