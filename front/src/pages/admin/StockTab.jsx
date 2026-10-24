import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/Icon';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Spinner } from '../../components/Skeleton';
import { getProdutos, atualizarEstoque, excluirProduto } from '../../api';
import { getErrorMessage } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { formatPreco, imageUrl } from '../../utils/format';

function StockRow({ produto, onSaved, onDelete }) {
  const { showToast } = useToast();
  const [valor, setValor] = useState(String(produto.estoque));
  const [salvando, setSalvando] = useState(false);
  const alterado = valor !== String(produto.estoque);

  const salvar = async () => {
    const novoEstoque = Number(valor);
    if (!Number.isInteger(novoEstoque) || novoEstoque < 0) {
      showToast('Informe um estoque inteiro maior ou igual a zero.', 'warning');
      return;
    }
    setSalvando(true);
    try {
      await atualizarEstoque(produto.id, novoEstoque);
      onSaved(produto.id, novoEstoque);
      showToast(`Estoque de "${produto.nome}" atualizado!`, 'success');
    } catch (err) {
      showToast(getErrorMessage(err, `Erro ao atualizar ${produto.nome}`), 'error');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <tr className={produto.estoque <= 0 ? 'is-soldout' : ''}>
      <td>
        <div className="stock-product">
          <img src={imageUrl(produto.imagem_url, 120)} alt="" width="48" height="48" loading="lazy" />
          <div>
            <p className="stock-product__name">{produto.nome}</p>
            <p className="stock-product__meta">{produto.categoria_nome || 'Sem categoria'}</p>
          </div>
        </div>
      </td>
      <td data-label="Preço">{formatPreco(produto.preco)}</td>
      <td data-label="Estoque">
        <form className="stock-edit" onSubmit={(e) => { e.preventDefault(); if (alterado) salvar(); }}>
          <label htmlFor={`estoque-${produto.id}`} className="sr-only">Estoque de {produto.nome}</label>
          <input
            id={`estoque-${produto.id}`}
            className={`input input--sm ${alterado ? 'input--dirty' : ''}`}
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          {alterado && (
            <button type="submit" className="btn btn--primary btn--sm" disabled={salvando}>
              {salvando ? '...' : 'Salvar'}
            </button>
          )}
          {!alterado && produto.estoque <= 0 && <span className="badge badge--dark">Esgotado</span>}
        </form>
      </td>
      <td className="stock-actions">
        <button type="button" className="icon-btn icon-btn--danger" onClick={() => onDelete(produto)} aria-label={`Excluir ${produto.nome}`} title="Excluir produto">
          <Icon name="trash" size={18} />
        </button>
      </td>
    </tr>
  );
}

export default function StockTab() {
  const { showToast } = useToast();
  const [produtos, setProdutos] = useState([]);
  const [status, setStatus] = useState('loading');
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [paraExcluir, setParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setStatus('loading');
    getProdutos({ limit: 100 })
      .then((data) => {
        setProdutos(data.produtos || []);
        setStatus('success');
      })
      .catch((err) => {
        setErro(getErrorMessage(err, 'Erro ao carregar produtos.'));
        setStatus('error');
      });
  }, [reloadKey]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return termo ? produtos.filter((p) => p.nome.toLowerCase().includes(termo)) : produtos;
  }, [produtos, busca]);

  const esgotados = produtos.filter((p) => p.estoque <= 0).length;

  const confirmarExclusao = async () => {
    setExcluindo(true);
    try {
      await excluirProduto(paraExcluir.id);
      setProdutos((prev) => prev.filter((p) => p.id !== paraExcluir.id));
      showToast('Produto removido da loja com sucesso!', 'success');
      setParaExcluir(null);
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao excluir produto.'), 'error');
    } finally {
      setExcluindo(false);
    }
  };

  if (status === 'loading') return <Spinner label="Carregando produtos..." />;
  if (status === 'error') {
    return (
      <EmptyState icon="alert" tone="error" title="Erro ao carregar produtos" description={erro}>
        <button type="button" className="btn btn--primary" onClick={() => setReloadKey((k) => k + 1)}><Icon name="refresh" size={18} /> Tentar novamente</button>
      </EmptyState>
    );
  }

  return (
    <div className="stack">
      <div className="admin-toolbar">
        <p className="muted">
          {produtos.length} {produtos.length === 1 ? 'produto ativo' : 'produtos ativos'}
          {esgotados > 0 && <> · <strong className="text-danger">{esgotados} esgotado(s)</strong></>}
        </p>
        <div className="search search--inline">
          <Icon name="search" size={18} className="search__icon" />
          <label htmlFor="busca-estoque" className="sr-only">Buscar produto</label>
          <input id="busca-estoque" type="search" className="search__input" placeholder="Buscar produto" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      </div>

      {visiveis.length === 0 ? (
        <EmptyState icon="box" title={produtos.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum produto encontrado'} />
      ) : (
        <div className="card table-wrap">
          <table className="table table--stock">
            <thead>
              <tr>
                <th scope="col">Produto</th>
                <th scope="col">Preço</th>
                <th scope="col">Estoque</th>
                <th scope="col"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((p) => (
                <StockRow
                  key={p.id}
                  produto={p}
                  onSaved={(id, estoque) => setProdutos((prev) => prev.map((x) => (x.id === id ? { ...x, estoque } : x)))}
                  onDelete={setParaExcluir}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(paraExcluir)}
        title="Excluir produto?"
        confirmLabel="Sim, excluir"
        loading={excluindo}
        onConfirm={confirmarExclusao}
        onCancel={() => setParaExcluir(null)}
      >
        <p>
          O produto <strong>{paraExcluir?.nome}</strong> deixará de aparecer na loja. O histórico de pedidos que já o incluem é preservado.
        </p>
      </ConfirmDialog>
    </div>
  );
}
