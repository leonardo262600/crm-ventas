import React, { useEffect, useState } from 'react';
import { Plus, X, Search, Package, Tag, Trash2, Edit2, Download } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const empty    = { sku:'', name:'', description:'', category:'', price:'', cost:'', stock:'', unit:'unidad' };
const emptyPL  = { name:'', description:'', currency:'MXN' };
import { fmtCurrency as fmt } from '../utils/format';
import ExportButtons from '../components/ExportButtons';

export default function Products() {
  const [tab, setTab]         = useState('products');

  /* ── Products state ── */
  const [products, setProducts] = useState([]);
  const [search, setSearch]     = useState('');
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(empty);
  const [editId, setEditId]     = useState(null);

  /* ── Price Lists state ── */
  const [priceLists, setPriceLists]   = useState([]);
  const [selectedPL, setSelectedPL]   = useState(null);  // full price list with items
  const [plModal, setPlModal]         = useState(false);
  const [plForm, setPlForm]           = useState(emptyPL);
  const [plEditId, setPlEditId]       = useState(null);
  const [itemForm, setItemForm]       = useState({ product_id:'', price:'' });

  /* ── Load products ── */
  const loadProducts = () =>
    api.get('/products', { params: { search } }).then(r => setProducts(r.data));

  useEffect(() => { loadProducts(); }, [search]);

  /* ── Load price lists ── */
  const loadPriceLists = () =>
    api.get('/price-lists').then(r => setPriceLists(r.data)).catch(() => {});

  useEffect(() => { loadPriceLists(); }, []);

  /* ── Product CRUD ── */
  const openNew  = () => { setForm(empty); setEditId(null); setModal(true); };
  const openEdit = p  => { setForm(p);     setEditId(p.id); setModal(true); };

  const saveProduct = async e => {
    e.preventDefault();
    try {
      if (editId) { await api.put(`/products/${editId}`, form); toast.success('Actualizado'); }
      else        { await api.post('/products', form); toast.success('Producto creado'); }
      setModal(false); loadProducts();
    } catch(err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const delProduct = async id => {
    if (!confirm('¿Desactivar producto?')) return;
    await api.delete(`/products/${id}`); toast.success('Desactivado'); loadProducts();
  };

  const margin = p =>
    p.price && p.cost ? (((p.price - p.cost) / p.price) * 100).toFixed(1) + '%' : '—';

  /* ── Price List CRUD ── */
  const openNewPL  = ()  => { setPlForm(emptyPL); setPlEditId(null); setPlModal(true); };
  const openEditPL = pl  => { setPlForm({ name:pl.name, description:pl.description||'', currency:pl.currency||'MXN' }); setPlEditId(pl.id); setPlModal(true); };

  const savePL = async e => {
    e.preventDefault();
    try {
      if (plEditId) { await api.put(`/price-lists/${plEditId}`, plForm); toast.success('Lista actualizada'); }
      else          { await api.post('/price-lists', plForm); toast.success('Lista creada'); }
      setPlModal(false); loadPriceLists();
      if (selectedPL && plEditId === selectedPL.id) loadPLDetail(plEditId);
    } catch(err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const delPL = async id => {
    if (!confirm('¿Eliminar lista de precios?')) return;
    await api.delete(`/price-lists/${id}`); toast.success('Eliminada');
    if (selectedPL?.id === id) setSelectedPL(null);
    loadPriceLists();
  };

  const loadPLDetail = async id => {
    const r = await api.get(`/price-lists/${id}`);
    setSelectedPL(r.data);
    setItemForm({ product_id:'', price:'' });
  };

  const setItem = async e => {
    e.preventDefault();
    if (!itemForm.product_id) { toast.error('Selecciona un producto'); return; }
    try {
      await api.post(`/price-lists/${selectedPL.id}/items`, itemForm);
      toast.success('Precio asignado');
      loadPLDetail(selectedPL.id);
      setItemForm({ product_id:'', price:'' });
    } catch(err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const removeItem = async productId => {
    if (!confirm('¿Quitar este producto de la lista?')) return;
    await api.delete(`/price-lists/${selectedPL.id}/items/${productId}`);
    toast.success('Eliminado'); loadPLDetail(selectedPL.id);
  };

  /* pre-fill price from base product when selecting */
  const onItemProductChange = pid => {
    const p = products.find(pr => pr.id === Number(pid));
    setItemForm({ product_id: pid, price: p ? p.price : '' });
  };

  return (
    <div>
      <div className="page-header">
        <div><h1>Productos y Catálogo</h1><p>Catálogo de productos y listas de precio</p></div>
        <div style={{ display:'flex', gap:8 }}>
          {tab === 'products' && (
            <>
              <ExportButtons 
                data={products} 
                filename="catalogo_productos" 
                title="Catálogo de Productos"
                columns={[
                  { header: 'SKU', accessor: 'sku' },
                  { header: 'Nombre', accessor: 'name' },
                  { header: 'Categoría', accessor: 'category' },
                  { header: 'Precio', accessor: p => fmt(p.price) },
                  { header: 'Costo', accessor: p => fmt(p.cost) },
                  { header: 'Stock', accessor: 'stock' },
                ]}
              />
              <button className="btn btn-primary" onClick={openNew}><Plus size={16}/>Nuevo producto</button>
            </>
          )}
          {tab === 'pricelists' && (
            <button className="btn btn-primary" onClick={openNewPL}><Plus size={16}/>Nueva lista</button>
          )}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab==='products'?'active':''}`}  onClick={() => setTab('products')}>
          <Package size={14} style={{ marginRight:6 }}/>Productos
        </button>
        <button className={`tab ${tab==='pricelists'?'active':''}`} onClick={() => setTab('pricelists')}>
          <Tag size={14} style={{ marginRight:6 }}/>Listas de precio
        </button>
      </div>

      {/* ── PRODUCTS TAB ── */}
      {tab === 'products' && (
        <div className="card">
          <div className="search-bar">
            <div className="search-input-wrap" style={{ flex:1 }}>
              <Search size={16}/>
              <input className="input" placeholder="Buscar por nombre o SKU..."
                value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
          </div>
          {products.length === 0 ? (
            <div className="empty-state"><Package size={48}/><h3>Sin productos</h3></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>SKU</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Costo</th><th>Margen</th><th>Stock</th><th></th></tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td><code style={{ background:'#f1f5f9', padding:'2px 8px', borderRadius:4, fontSize:12 }}>{p.sku||'—'}</code></td>
                      <td style={{ fontWeight:500 }}>{p.name}</td>
                      <td>{p.category ? <span className="badge badge-blue">{p.category}</span> : '—'}</td>
                      <td style={{ fontWeight:600, color:'#0f766e' }}>{fmt(p.price)}</td>
                      <td style={{ color:'#64748b' }}>{fmt(p.cost)}</td>
                      <td><span className="badge badge-green">{margin(p)}</span></td>
                      <td>{p.stock ?? '—'}</td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn-icon" onClick={() => openEdit(p)}>✏</button>
                          <button className="btn-icon" style={{ color:'#ef4444' }} onClick={() => delProduct(p.id)}><X size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PRICE LISTS TAB ── */}
      {tab === 'pricelists' && (
        <div style={{ display:'grid', gridTemplateColumns: selectedPL ? '280px 1fr' : '1fr', gap:20 }}>

          {/* Left: list of price lists */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {priceLists.length === 0 && (
              <div className="card"><div className="empty-state" style={{ minHeight:120 }}><Tag size={36}/><p>Sin listas de precio</p></div></div>
            )}
            {priceLists.map(pl => (
              <div key={pl.id}
                onClick={() => loadPLDetail(pl.id)}
                className="card"
                style={{
                  cursor:'pointer', padding:'16px 18px',
                  border: selectedPL?.id===pl.id ? '2px solid #0f766e' : '2px solid transparent',
                  transition:'border-color .15s',
                }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <p style={{ fontWeight:600, fontSize:14 }}>{pl.name}</p>
                    {pl.description && <p style={{ fontSize:12, color:'#64748b', marginTop:3 }}>{pl.description}</p>}
                    <p style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
                      {pl.currency} · {pl.item_count ?? 0} productos
                    </p>
                  </div>
                  <div style={{ display:'flex', gap:4 }} onClick={e => e.stopPropagation()}>
                    <button className="btn-icon" onClick={() => openEditPL(pl)}><Edit2 size={14}/></button>
                    <button className="btn-icon" style={{ color:'#ef4444' }} onClick={() => delPL(pl.id)}><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: selected PL detail */}
          {selectedPL && (
            <div className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                <div>
                  <h3 style={{ fontWeight:700, fontSize:16 }}>{selectedPL.name}</h3>
                  <p style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
                    {selectedPL.description || 'Sin descripción'} · {selectedPL.currency}
                  </p>
                </div>
                <button className="btn-icon" onClick={() => setSelectedPL(null)}><X size={16}/></button>
              </div>

              {/* Add item form */}
              <form onSubmit={setItem} style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'flex-end' }}>
                <div className="input-group" style={{ flex:2, minWidth:180, margin:0 }}>
                  <label style={{ fontSize:11 }}>Producto</label>
                  <select className="input" value={itemForm.product_id}
                    onChange={e => onItemProductChange(e.target.value)}>
                    <option value="">Seleccionar producto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="input-group" style={{ flex:1, minWidth:120, margin:0 }}>
                  <label style={{ fontSize:11 }}>Precio en lista</label>
                  <input className="input" type="number" min="0" step="0.01"
                    value={itemForm.price}
                    onChange={e => setItemForm(f => ({ ...f, price:e.target.value }))}
                    placeholder="0.00"/>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginBottom:0 }}>
                  <Plus size={14}/>Asignar
                </button>
              </form>

              {/* Items table */}
              {(!selectedPL.items || selectedPL.items.length === 0) ? (
                <div className="empty-state" style={{ minHeight:120 }}>
                  <Package size={36}/><p>Sin productos asignados aún</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Producto</th><th>SKU</th><th style={{ textAlign:'right' }}>Precio base</th><th style={{ textAlign:'right' }}>Precio en lista</th><th style={{ textAlign:'right' }}>Dif.</th><th></th></tr>
                    </thead>
                    <tbody>
                      {selectedPL.items.map(item => {
                        const diff = item.price - (item.base_price || item.price);
                        const diffPct = item.base_price ? (((item.price - item.base_price) / item.base_price) * 100).toFixed(1) : null;
                        return (
                          <tr key={item.product_id}>
                            <td style={{ fontWeight:500 }}>{item.product_name}</td>
                            <td><code style={{ background:'#f1f5f9', padding:'2px 6px', borderRadius:4, fontSize:11 }}>{item.sku||'—'}</code></td>
                            <td style={{ textAlign:'right', color:'#94a3b8', fontSize:12 }}>{fmt(item.base_price)}</td>
                            <td style={{ textAlign:'right', fontWeight:600, color:'#0f766e' }}>{fmt(item.price)}</td>
                            <td style={{ textAlign:'right' }}>
                              {diffPct !== null && (
                                <span className={`badge ${diff < 0 ? 'badge-red' : diff > 0 ? 'badge-green' : 'badge-gray'}`}>
                                  {diff > 0 ? '+' : ''}{diffPct}%
                                </span>
                              )}
                            </td>
                            <td>
                              <button className="btn-icon" style={{ color:'#ef4444' }}
                                onClick={() => removeItem(item.product_id)}>
                                <Trash2 size={14}/>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Product modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editId ? 'Editar producto' : 'Nuevo producto'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={saveProduct}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="input-group"><label>SKU</label><input className="input" value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))}/></div>
                  <div className="input-group"><label>Nombre *</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/></div>
                  <div className="input-group"><label>Categoría</label><input className="input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}/></div>
                  <div className="input-group"><label>Unidad</label><input className="input" value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}/></div>
                  <div className="input-group"><label>Precio</label><input className="input" type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))}/></div>
                  <div className="input-group"><label>Costo</label><input className="input" type="number" min="0" step="0.01" value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))}/></div>
                  <div className="input-group"><label>Stock</label><input className="input" type="number" min="0" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))}/></div>
                </div>
                <div className="input-group"><label>Descripción</label><textarea className="input" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{resize:'vertical'}}/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price List modal */}
      {plModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setPlModal(false)}>
          <div className="modal" style={{ maxWidth:480 }}>
            <div className="modal-header">
              <h3>{plEditId ? 'Editar lista de precio' : 'Nueva lista de precio'}</h3>
              <button className="btn-icon" onClick={() => setPlModal(false)}><X size={18}/></button>
            </div>
            <form onSubmit={savePL}>
              <div className="modal-body">
                <div className="input-group"><label>Nombre *</label><input className="input" value={plForm.name} onChange={e=>setPlForm(f=>({...f,name:e.target.value}))} required placeholder="Ej: Mayorista, VIP, Distribuidor"/></div>
                <div className="input-group"><label>Descripción</label><input className="input" value={plForm.description} onChange={e=>setPlForm(f=>({...f,description:e.target.value}))}/></div>
                <div className="input-group"><label>Moneda</label>
                  <select className="input" value={plForm.currency} onChange={e=>setPlForm(f=>({...f,currency:e.target.value}))}>
                    <option value="MXN">MXN — Peso mexicano</option>
                    <option value="USD">USD — Dólar</option>
                    <option value="PEN">PEN — Sol peruano</option>
                    <option value="COP">COP — Peso colombiano</option>
                    <option value="EUR">EUR — Euro</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setPlModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
