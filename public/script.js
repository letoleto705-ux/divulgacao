/* Os produtos e links agora são cadastrados na página administracao.html (não precisa editar este arquivo). */
let PRODUTOS = [];
const NOMES = { "recomendo": "Produtos que RECOMENDO", "nao-recomendo": "Produtos que NÃO RECOMENDO" };
const $ = (id) => document.getElementById(id);
const el = { home: $("home"), lista: $("lista"), titulo: $("lista-titulo"), produtos: $("produtos"), vazio: $("vazio"), busca: $("busca"), modal: $("modal") };
let categoriaAtual = null;

const norm = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const seguro = (u) => (/^(https?:\/\/|data:image\/|\/|[\w.-]+\.(jpg|jpeg|png|webp|gif|mp4)$)/i.test(u || "") ? u : "");

function capaPadrao(nome) {
  const letra = esc((nome || "U").charAt(0).toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B2A6F"/><stop offset="1" stop-color="#06143A"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><path d="M30 150 Q100 190 170 140" stroke="#FF7A00" stroke-width="8" fill="none" stroke-linecap="round"/><text x="100" y="125" font-family="Arial" font-weight="900" font-style="italic" font-size="100" fill="#fff" text-anchor="middle">${letra}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
const capaDe = (p) => seguro(p.thumbnail) || (p.tipoMidia === "imagem" && seguro(p.urlMidia)) || capaPadrao(p.nome);
const ehVideo = (p) => p.tipoMidia === "video" && p.urlMidia;
const linkSeguro = (u) => (/^https?:\/\//i.test(u || "") ? u : "#");

function embedYoutube(url) {
  const m = url.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0&playsinline=1` : null;
}

function cardProduto(p) {
  const play = ehVideo(p) ? '<span class="play"><i></i></span>' : "";
  const rotulo = ehVideo(p) ? "Ver Review" : "Ver foto";
  const cat = p.categoria === "nao-recomendo" ? "nao-recomendo" : "recomendo";
  return `<article class="produto ${cat}">
    <button class="media" data-abrir="${esc(p.id)}" aria-label="${rotulo}: ${esc(p.nome)}"><img src="${esc(capaDe(p))}" alt="${esc(p.nome)}" loading="lazy">${play}</button>
    <div class="info">
      <span class="tag-plat">${esc(p.plataforma)}</span>
      <h3>${esc(p.nome)}</h3><p>${esc(p.veredito)}</p>
      <div class="acoes"><button class="review" data-abrir="${esc(p.id)}">${rotulo}</button>
      <a class="cta" href="${esc(linkSeguro(p.linkAfiliado))}" target="_blank" rel="noopener noreferrer">Comprar / Ver Oferta ↗</a></div>
    </div></article>`;
}

function renderizar(lista) { el.produtos.innerHTML = lista.map(cardProduto).join(""); el.vazio.hidden = lista.length > 0; }

function abrirCategoria(cat) {
  categoriaAtual = cat; el.titulo.textContent = NOMES[cat];
  renderizar(PRODUTOS.filter((p) => p.categoria === cat));
  el.home.hidden = true; el.lista.hidden = false; window.scrollTo({ top: 0, behavior: "smooth" });
}
function voltar() { categoriaAtual = null; el.busca.value = ""; el.lista.hidden = true; el.home.hidden = false; }
function buscar() {
  const q = norm(el.busca.value);
  if (!q) { categoriaAtual ? abrirCategoria(categoriaAtual) : voltar(); return; }
  const achados = PRODUTOS.filter((p) => norm([p.nome, p.veredito, p.plataforma, String(p.categoria).replace("-", " "), (p.tags || []).join(" ")].join(" ")).includes(q));
  el.titulo.textContent = `Resultados para “${el.busca.value.trim()}”`;
  renderizar(achados); el.home.hidden = true; el.lista.hidden = false;
}

function abrirModal(id) {
  const p = PRODUTOS.find((x) => String(x.id) === String(id));
  if (!p) return;
  const area = $("modal-midia"); area.innerHTML = "";
  if (ehVideo(p)) {
    const yt = embedYoutube(p.urlMidia);
    if (yt) area.innerHTML = `<iframe src="${esc(yt)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="${esc(p.nome)}"></iframe>`;
    else if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(p.urlMidia)) area.innerHTML = `<video src="${esc(seguro(p.urlMidia))}" poster="${esc(capaDe(p))}" controls autoplay playsinline></video>`;
    else area.innerHTML = `<iframe src="${esc(seguro(p.urlMidia))}" allowfullscreen title="${esc(p.nome)}"></iframe>`;
  } else {
    area.innerHTML = `<img src="${esc(seguro(p.urlMidia) || capaDe(p))}" alt="${esc(p.nome)}">`;
  }
  $("modal-nome").textContent = p.nome; $("modal-veredito").textContent = p.veredito; $("modal-cta").href = linkSeguro(p.linkAfiliado);
  el.modal.hidden = false; document.body.style.overflow = "hidden"; $("fechar").focus();
}
function fecharModal() { el.modal.hidden = true; $("modal-midia").innerHTML = ""; document.body.style.overflow = ""; }

document.querySelectorAll(".cat").forEach((b) => b.addEventListener("click", () => abrirCategoria(b.dataset.cat)));
$("voltar").addEventListener("click", voltar);
el.busca.addEventListener("input", buscar);
el.produtos.addEventListener("click", (e) => { const b = e.target.closest("[data-abrir]"); if (b) abrirModal(b.dataset.abrir); });
$("fechar").addEventListener("click", fecharModal);
el.modal.addEventListener("click", (e) => { if (e.target === el.modal) fecharModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !el.modal.hidden) fecharModal(); });

/* ---------- Dados vindos do servidor (cadastrados na administração) ---------- */
const zap = (v) => (/^https?:\/\//i.test(v) ? v : "https://wa.me/" + String(v).replace(/\D/g, ""));
function aplicarConfig(c) {
  [["instagram", "s-instagram"], ["tiktok", "s-tiktok"], ["youtube", "s-youtube"], ["whatsapp", "s-whatsapp"]].forEach(([k, id]) => {
    const a = $(id), v = (c[k] || "").trim();
    if (v) a.href = k === "whatsapp" ? zap(v) : linkSeguro(v); else a.hidden = true;
  });
  const loja = $("loja-btn"), l = (c.loja || "").trim();
  if (/^https?:\/\//i.test(l)) loja.href = l;
  else loja.addEventListener("click", (e) => { e.preventDefault(); alert("A loja Utilike abre em breve!"); });
  if (c.nomeLoja && c.nomeLoja.trim().toLowerCase() !== "utilike") $("nome-loja").textContent = c.nomeLoja;
  const foto = seguro(c.perfil);
  if (foto) { $("avatar").classList.add("foto"); $("avatar").innerHTML = `<img src="${esc(foto)}" alt="Foto de perfil">`; }
}
function contadores() {
  Object.keys(NOMES).forEach((cat) => {
    const n = PRODUTOS.filter((p) => p.categoria === cat).length;
    $("n-" + cat).textContent = n + (n === 1 ? " produto testado" : " produtos testados");
  });
}
async function carregar() {
  let d = { config: {}, produtos: [] };
  try { const r = await fetch("/api/dados", { cache: "no-store" }); if (r.ok) d = await r.json(); } catch (e) {}
  PRODUTOS = Array.isArray(d.produtos) ? d.produtos : [];
  aplicarConfig(d.config || {}); contadores();
}
$("ano").textContent = new Date().getFullYear();
carregar();
