import "./styles.css";
import {
  AuthError,
  getSettings,
  getUser,
  handleAuthCallback,
  login,
  logout,
  onAuthChange,
  requestPasswordRecovery,
  signup,
  updateUser
} from "@netlify/identity";

const app = document.querySelector("#app");
const toastBox = document.querySelector("#toast");

const emptyState = () => ({
  version: 5,
  profile: { name: "", avatar: "" },
  settings: { theme: "system", font: 1.08, compact: false },
  water: { target: 2500, current: 0, alerts: false, interval: 120 },
  supplements: [],
  training: { weeklyGoal: 4, done: 0, videos: [] },
  progress: []
});

let user = null;
let state = emptyState();
let tab = "home";
let authView = "login";
let recoverySession = false;
let saveTimer = 0;
let saving = false;

const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

function toast(text, type = "ok") {
  toastBox.textContent = text;
  toastBox.className = `show ${type}`;
  clearTimeout(toastBox._t);
  toastBox._t = setTimeout(() => toastBox.className = "", 2800);
}

function msg(error) {
  if (error instanceof AuthError) {
    if (error.status === 401) return "E-mail ou senha inválidos.";
    if (error.status === 403) return "Cadastro indisponível. Confira se Registration está como Open no Netlify Identity.";
    if (error.status === 422) return "Confira o e-mail e use uma senha com pelo menos 8 caracteres.";
    return error.message || "Falha na autenticação.";
  }
  return error?.message || "Não foi possível concluir.";
}

function merge(base, extra) {
  if (!extra || typeof extra !== "object" || Array.isArray(extra)) return structuredClone(base);
  const out = structuredClone(base);
  const walk = (a, b) => Object.entries(b).forEach(([k, v]) => {
    if (v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) {
      walk(a[k], v);
    } else {
      a[k] = v;
    }
  });
  walk(out, extra);
  return out;
}

function applyUi() {
  document.documentElement.dataset.theme = state.settings.theme;
  document.documentElement.style.setProperty("--scale", state.settings.font);
  document.body.classList.toggle("compact", state.settings.compact);
}

async function api(method = "GET", body) {
  const r = await fetch("/api/state", {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Falha na sincronização.");
  return data;
}

async function loadState() {
  try {
    const data = await api();
    state = data.state ? merge(emptyState(), data.state) : emptyState();
    if (!state.profile.name && user?.name) state.profile.name = user.name;
    applyUi();
    if (!data.state) await saveNow();
  } catch (e) {
    console.error(e);
    toast("Não foi possível carregar seus dados.", "error");
  }
}

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 500);
}

async function saveNow() {
  if (!user || saving) return;
  saving = true;
  syncText("Salvando…");
  try {
    await api("PUT", { state });
    syncText("Sincronizado");
  } catch (e) {
    console.error(e);
    syncText("Erro ao sincronizar");
  } finally {
    saving = false;
  }
}

function syncText(t) {
  const e = document.querySelector("#sync");
  if (e) e.textContent = t;
}

function avatar() {
  if (state.profile.avatar) return `<img src="${state.profile.avatar}" alt="">`;
  const n = (state.profile.name || user?.name || user?.email || "P").trim();
  return `<span>${esc(n[0]?.toUpperCase() || "P")}</span>`;
}

function authHtml() {
  const create = authView === "signup";
  const forgot = authView === "forgot";
  const reset = authView === "reset";
  return `
    <main class="auth">
      <section class="authIntro">
        <div class="logo">P<span>✓</span></div>
        <div>
          <p class="caps">PERSONAL PRO MANAGER</p>
          <h1>Rotina fitness organizada, sem complicação.</h1>
          <p>Conta real, dados privados por usuário e sincronização pelo Netlify.</p>
        </div>
        <div class="checks"><span>✓ Sem conta demo</span><span>✓ Banco por usuário</span><span>✓ Mobile-first</span></div>
      </section>
      <section class="authSide">
        <form id="authForm" class="authCard">
          <div class="mobileBrand"><div class="logo small">P<span>✓</span></div><strong>Personal Pro</strong></div>
          <p class="caps">${reset ? "NOVA SENHA" : create ? "CRIAR CONTA" : forgot ? "RECUPERAR CONTA" : "ACESSO"}</p>
          <h2>${reset ? "Redefina sua senha" : create ? "Comece agora" : forgot ? "Recupere seu acesso" : "Entre na sua conta"}</h2>
          <p class="muted">${create ? "A confirmação será enviada para o seu e-mail." : forgot ? "Você receberá um link seguro." : reset ? "Escolha uma nova senha." : "Não existe acesso demo nesta versão."}</p>
          ${create ? `<label>Nome<input id="name" required minlength="2" autocomplete="name" placeholder="Seu nome"></label>` : ""}
          ${!reset ? `<label>E-mail<input id="email" type="email" required autocomplete="email" placeholder="voce@email.com"></label>` : ""}
          ${!forgot ? `<label>${reset ? "Nova senha" : "Senha"}<input id="password" type="password" required minlength="8" autocomplete="${create || reset ? "new-password" : "current-password"}" placeholder="Mínimo 8 caracteres"></label>` : ""}
          <button class="primary full" type="submit">${reset ? "Salvar nova senha" : create ? "Criar conta" : forgot ? "Enviar recuperação" : "Entrar"}</button>
          <p id="authMsg" class="formMsg"></p>
          <div class="authLinks">
            ${create ? `<button type="button" data-auth="login">Já tenho conta</button>` :
              forgot || reset ? `<button type="button" data-auth="login">Voltar para entrar</button>` :
              `<button type="button" data-auth="forgot">Esqueci a senha</button><button type="button" data-auth="signup">Criar conta</button>`}
          </div>
        </form>
      </section>
    </main>`;
}

function top() {
  return `<header class="top">
    <div class="brand"><div class="logo small">P<span>✓</span></div><div><strong>Personal Pro</strong><small id="sync">Sincronizado</small></div></div>
    <button class="avatar" data-tabto="settings">${avatar()}</button>
  </header>`;
}

function home() {
  const pct = Math.min(100, Math.round((state.water.current / Math.max(state.water.target, 1)) * 100));
  return `
    <section class="head"><p class="caps">HOJE</p><h1>Olá, ${esc((state.profile.name || user?.name || "Atleta").split(" ")[0])}.</h1><p>Faça o básico bem feito e continue.</p></section>
    <section class="hero"><div><p class="caps light">SEMANA</p><h2>${state.training.done}/${state.training.weeklyGoal} treinos</h2><p>Consistência acima de perfeição.</p></div><button class="white" data-workout>Registrar treino</button></section>
    <section class="cards">
      <article class="card"><div class="rowTitle"><span>💧</span><div><small>ÁGUA</small><h3>${state.water.current} ml</h3></div></div><div class="bar"><i style="width:${pct}%"></i></div><div class="actions"><button data-water="250">+250 ml</button><button data-water="500">+500 ml</button></div></article>
      <article class="card"><div class="rowTitle"><span>💊</span><div><small>SUPLEMENTOS</small><h3>${state.supplements.length}</h3></div></div><p>${state.supplements.length ? "Seus lembretes estão configurados." : "Nenhum suplemento cadastrado."}</p><button class="link" data-tabto="settings">Configurar →</button></article>
    </section>`;
}

function training() {
  return `
    <section class="head smallHead"><p class="caps">TREINOS</p><h1>Sua biblioteca</h1><p>Links leves, sem hospedar vídeo no aplicativo.</p></section>
    <article class="card"><div class="between"><div><small>META SEMANAL</small><h3>${state.training.done}/${state.training.weeklyGoal}</h3></div><button class="primary" data-workout>+ Treino</button></div></article>
    <article class="card"><form id="videoForm" class="inline"><input id="videoName" required placeholder="Nome do treino"><input id="videoUrl" type="url" required placeholder="Link do vídeo"><button class="primary">Salvar</button></form></article>
    <div class="list">${state.training.videos.length ? state.training.videos.map(v => `<div class="item"><div><strong>${esc(v.name)}</strong><a href="${esc(v.url)}" target="_blank" rel="noopener">Abrir vídeo</a></div><button class="x" data-delvideo="${v.id}">×</button></div>`).join("") : `<div class="empty">Nenhum vídeo salvo.</div>`}</div>`;
}

function progress() {
  return `
    <section class="head smallHead"><p class="caps">PROGRESSO</p><h1>Registros</h1><p>Simples e rápido.</p></section>
    <article class="card"><form id="weightForm" class="inline two"><input id="weight" type="number" min="20" max="400" step=".1" required placeholder="Peso em kg"><button class="primary">Registrar</button></form></article>
    <div class="list">${state.progress.length ? [...state.progress].reverse().map(p => `<div class="item"><div><strong>${Number(p.value).toLocaleString("pt-BR")} kg</strong><small>${new Date(p.date).toLocaleDateString("pt-BR")}</small></div><button class="x" data-delprogress="${p.id}">×</button></div>`).join("") : `<div class="empty">Nenhum registro ainda.</div>`}</div>`;
}

function settings() {
  return `
    <section class="head smallHead"><p class="caps">CONFIGURAÇÕES</p><h1>Conta e preferências</h1><p>${esc(user?.email || "")}</p></section>
    <div class="settings">
      <article class="card">
        <h2>Perfil</h2>
        <div class="profileRow"><label class="photo">${avatar()}<input id="photo" type="file" accept="image/*" hidden></label><div><strong>Foto de perfil</strong><small>Reduzida automaticamente para ficar leve.</small></div></div>
        <label>Nome<input id="profileName" value="${esc(state.profile.name)}" placeholder="Seu nome"></label>
      </article>
      <article class="card">
        <h2>Interface</h2>
        <label>Tema<select id="theme"><option value="system" ${state.settings.theme==="system"?"selected":""}>Automático</option><option value="light" ${state.settings.theme==="light"?"selected":""}>Claro</option><option value="dark" ${state.settings.theme==="dark"?"selected":""}>Escuro</option></select></label>
        <label>Fonte <span id="fontValue">${Math.round(state.settings.font*100)}%</span><input id="font" type="range" min="1" max="1.3" step=".05" value="${state.settings.font}"></label>
        <label class="toggle"><span><strong>Modo compacto</strong><small>Menos espaço, mesma legibilidade.</small></span><input id="compact" type="checkbox" ${state.settings.compact?"checked":""}></label>
      </article>
      <article class="card">
        <h2>Água</h2>
        <div class="formGrid"><label>Meta (ml)<input id="waterTarget" type="number" min="500" max="10000" step="100" value="${state.water.target}"></label><label>Intervalo<select id="waterInterval">${[60,90,120,180].map(n=>`<option value="${n}" ${state.water.interval===n?"selected":""}>${n} min</option>`).join("")}</select></label></div>
        <label class="toggle"><span><strong>Alertas</strong><small>Enquanto o app estiver ativo.</small></span><input id="waterAlerts" type="checkbox" ${state.water.alerts?"checked":""}></label>
        <button data-notify>Autorizar notificações</button>
      </article>
      <article class="card">
        <h2>Suplementos</h2>
        <form id="suppForm" class="inline"><input id="suppName" required placeholder="Ex.: Creatina"><input id="suppTime" type="time" required><button class="primary">Adicionar</button></form>
        <div class="miniList">${state.supplements.map(s=>`<div><span><strong>${esc(s.name)}</strong><small>${esc(s.time)}</small></span><button class="x" data-delsupp="${s.id}">×</button></div>`).join("") || `<div class="empty mini">Nenhum cadastrado.</div>`}</div>
      </article>
      <article class="card dangerZone">
        <h2>Conta</h2>
        <p><strong>${esc(user?.email || "")}</strong></p>
        <div class="actions"><button data-logout>Sair</button><button class="dangerOutline" data-reset>Zerar dados da conta</button></div>
        <small>Zerar dados apaga treino, água, suplementos, progresso, foto e preferências. O login continua existindo.</small>
      </article>
    </div>`;
}

function nav() {
  return `<nav>${[
    ["home","⌂","Início"],["training","▶","Treinos"],["progress","↗","Progresso"],["settings","⚙","Config."]
  ].map(([k,i,l])=>`<button class="${tab===k?"active":""}" data-tab="${k}"><span>${i}</span><small>${l}</small></button>`).join("")}</nav>`;
}

function modal() {
  return `<div id="modal" class="modal" hidden><div class="modalCard"><p class="caps dangerText">AÇÃO IRREVERSÍVEL</p><h2>Zerar seus dados?</h2><p>Seu e-mail e senha serão mantidos. Os dados do Personal Pro Manager serão apagados.</p><label>Digite <strong>ZERAR</strong><input id="confirmReset" autocomplete="off"></label><div class="actions"><button data-cancel>Cancelar</button><button id="doReset" class="danger" disabled>Zerar dados</button></div></div></div>`;
}

function render() {
  if (!user) {
    app.innerHTML = authHtml();
    bindAuth();
    return;
  }
  const body = tab === "training" ? training() : tab === "progress" ? progress() : tab === "settings" ? settings() : home();
  app.innerHTML = `<div class="shell">${top()}<main>${body}</main>${nav()}</div>${modal()}`;
  applyUi();
  bindApp();
}

function bindAuth() {
  document.querySelectorAll("[data-auth]").forEach(b => b.onclick = () => {
    authView = b.dataset.auth;
    render();
  });

  document.querySelector("#authForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const out = document.querySelector("#authMsg");
    const submit = e.currentTarget.querySelector("button[type=submit]");
    submit.disabled = true;
    out.textContent = "";
    try {
      if (authView === "signup") {
        const settings = await getSettings();
        if (settings.disableSignup) throw new Error("O cadastro está fechado no Netlify Identity.");
        const created = await signup(
          document.querySelector("#email").value.trim(),
          document.querySelector("#password").value,
          { full_name: document.querySelector("#name").value.trim() }
        );
        if (created.emailVerified) {
          user = created;
          await loadState();
          render();
        } else {
          out.className = "formMsg success";
          out.textContent = "Conta criada. Confirme o e-mail recebido e depois entre.";
        }
      } else if (authView === "forgot") {
        await requestPasswordRecovery(document.querySelector("#email").value.trim());
        out.className = "formMsg success";
        out.textContent = "Link de recuperação enviado. Confira também o spam.";
      } else if (authView === "reset") {
        await updateUser({ password: document.querySelector("#password").value });
        recoverySession = false;
        user = await getUser();
        if (user) {
          await loadState();
          render();
          toast("Senha alterada.");
        } else {
          authView = "login";
          render();
        }
      } else {
        user = await login(
          document.querySelector("#email").value.trim(),
          document.querySelector("#password").value
        );
        await loadState();
        tab = "home";
        render();
      }
    } catch (e) {
      out.className = "formMsg error";
      out.textContent = msg(e);
    } finally {
      submit.disabled = false;
    }
  });
}

function bindApp() {
  document.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { tab = b.dataset.tab; render(); });
  document.querySelectorAll("[data-tabto]").forEach(b => b.onclick = () => { tab = b.dataset.tabto; render(); });

  document.querySelectorAll("[data-workout]").forEach(b => b.onclick = () => {
    state.training.done = Math.min(14, state.training.done + 1);
    queueSave(); render(); toast("Treino registrado.");
  });

  document.querySelectorAll("[data-water]").forEach(b => b.onclick = () => {
    state.water.current += Number(b.dataset.water);
    queueSave(); render();
  });

  document.querySelector("#videoForm")?.addEventListener("submit", e => {
    e.preventDefault();
    state.training.videos.push({
      id: crypto.randomUUID(),
      name: document.querySelector("#videoName").value.trim(),
      url: document.querySelector("#videoUrl").value.trim()
    });
    queueSave(); render();
  });

  document.querySelectorAll("[data-delvideo]").forEach(b => b.onclick = () => {
    state.training.videos = state.training.videos.filter(v => v.id !== b.dataset.delvideo);
    queueSave(); render();
  });

  document.querySelector("#weightForm")?.addEventListener("submit", e => {
    e.preventDefault();
    state.progress.push({
      id: crypto.randomUUID(),
      value: Number(document.querySelector("#weight").value),
      date: new Date().toISOString()
    });
    queueSave(); render();
  });

  document.querySelectorAll("[data-delprogress]").forEach(b => b.onclick = () => {
    state.progress = state.progress.filter(v => v.id !== b.dataset.delprogress);
    queueSave(); render();
  });

  const name = document.querySelector("#profileName");
  if (name) name.onchange = e => { state.profile.name = e.target.value.trim(); queueSave(); render(); };

  const theme = document.querySelector("#theme");
  if (theme) theme.onchange = e => { state.settings.theme = e.target.value; applyUi(); queueSave(); };

  const font = document.querySelector("#font");
  if (font) font.oninput = e => {
    state.settings.font = Number(e.target.value);
    document.querySelector("#fontValue").textContent = `${Math.round(state.settings.font*100)}%`;
    applyUi(); queueSave();
  };

  const compact = document.querySelector("#compact");
  if (compact) compact.onchange = e => { state.settings.compact = e.target.checked; applyUi(); queueSave(); };

  const target = document.querySelector("#waterTarget");
  if (target) target.onchange = e => { state.water.target = Number(e.target.value) || 2500; queueSave(); };

  const interval = document.querySelector("#waterInterval");
  if (interval) interval.onchange = e => { state.water.interval = Number(e.target.value); queueSave(); };

  const alerts = document.querySelector("#waterAlerts");
  if (alerts) alerts.onchange = e => { state.water.alerts = e.target.checked; queueSave(); };

  document.querySelector("[data-notify]")?.addEventListener("click", async () => {
    if (!("Notification" in window)) return toast("Notificações indisponíveis.", "error");
    const p = await Notification.requestPermission();
    toast(p === "granted" ? "Notificações autorizadas." : "Permissão não concedida.", p === "granted" ? "ok" : "error");
  });

  document.querySelector("#suppForm")?.addEventListener("submit", e => {
    e.preventDefault();
    state.supplements.push({
      id: crypto.randomUUID(),
      name: document.querySelector("#suppName").value.trim(),
      time: document.querySelector("#suppTime").value
    });
    queueSave(); render();
  });

  document.querySelectorAll("[data-delsupp]").forEach(b => b.onclick = () => {
    state.supplements = state.supplements.filter(v => v.id !== b.dataset.delsupp);
    queueSave(); render();
  });

  document.querySelector("#photo")?.addEventListener("change", e => compressAvatar(e.target.files?.[0]));

  document.querySelector("[data-logout]")?.addEventListener("click", async () => {
    await saveNow();
    await logout();
    user = null;
    state = emptyState();
    tab = "home";
    render();
  });

  const modal = document.querySelector("#modal");
  document.querySelector("[data-reset]")?.addEventListener("click", () => {
    modal.hidden = false;
    setTimeout(() => document.querySelector("#confirmReset").focus(), 30);
  });
  document.querySelector("[data-cancel]")?.addEventListener("click", () => modal.hidden = true);
  document.querySelector("#confirmReset")?.addEventListener("input", e => {
    document.querySelector("#doReset").disabled = e.target.value.trim().toUpperCase() !== "ZERAR";
  });
  document.querySelector("#doReset")?.addEventListener("click", async e => {
    e.currentTarget.disabled = true;
    try {
      await api("DELETE");
      state = emptyState();
      if (user?.name) state.profile.name = user.name;
      await saveNow();
      modal.hidden = true;
      tab = "home";
      render();
      toast("Dados zerados. Sua conta foi mantida.");
    } catch (err) {
      toast(msg(err), "error");
      e.currentTarget.disabled = false;
    }
  });
}

function compressAvatar(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) return toast("Escolha uma imagem.", "error");
  const img = new Image();
  img.onload = () => {
    const size = 160;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, (size-w)/2, (size-h)/2, w, h);
    state.profile.avatar = canvas.toDataURL("image/jpeg", .68);
    URL.revokeObjectURL(img.src);
    queueSave(); render(); toast("Foto atualizada.");
  };
  img.src = URL.createObjectURL(file);
}

function scheduleWaterAlert() {
  setInterval(() => {
    if (!user || !state.water.alerts || document.hidden) return;
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Hora da água 💧", { body: `Hoje: ${state.water.current}/${state.water.target} ml` });
    }
  }, 60_000);
}

async function boot() {
  try {
    const callback = await handleAuthCallback();
    if (callback?.type === "recovery") {
      user = callback.user || await getUser();
      recoverySession = true;
      authView = "reset";
      render();
      return;
    }
    if (callback?.type === "confirmation") toast("E-mail confirmado. Conta liberada.");
    user = await getUser();
    if (user) await loadState();
  } catch (e) {
    console.error(e);
    toast("Falha ao iniciar autenticação.", "error");
  }
  render();
  scheduleWaterAlert();
}

onAuthChange(async (_event, current) => {
  if (current?.id && !user?.id) {
    user = current;
    await loadState();
    render();
  } else if (!current && user) {
    user = null;
    state = emptyState();
    render();
  }
});

boot();
