const API_BASE = 'http://localhost:3000/api/v1';

if (localStorage.getItem('token')) {
  window.location.href = 'geo_admin.html';
}

// Allow submitting with Enter key
document.addEventListener('DOMContentLoaded', () => {
  const senhaField = document.getElementById('senha');
  const emailField = document.getElementById('email');
  if (senhaField) senhaField.addEventListener('keydown', e => { if (e.key === 'Enter') submitLogin(); });
  if (emailField) emailField.addEventListener('keydown', e => { if (e.key === 'Enter') submitLogin(); });
});

async function submitLogin() {
  const email = document.getElementById('email')?.value.trim();
  const senha = document.getElementById('senha')?.value.trim();
  const errorBox = document.getElementById('login-error');

  if (!email || !senha) {
    showError('Preencha e-mail e senha.');
    return;
  }

  // Basic email validation
  if (!email.includes('@') || !email.includes('.')) {
    showError('Informe um e-mail válido.');
    return;
  }

  const btn = document.querySelector('.login-submit');
  if (btn) { btn.textContent = 'Entrando...'; btn.disabled = true; }

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    const data = await response.json();
    if (!response.ok) {
      showError(data.erro || 'Falha no login. Verifique suas credenciais.');
      return;
    }

    localStorage.setItem('token', data.token);
    window.location.href = 'geo_admin.html';
  } catch (err) {
    showError('Não foi possível conectar com o servidor.');
    console.error(err);
  } finally {
    if (btn) { btn.textContent = 'Entrar no painel →'; btn.disabled = false; }
  }
}

function showError(message) {
  const errorBox = document.getElementById('login-error');
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.style.display = 'block';
  // Auto-hide after 5 seconds
  setTimeout(() => { if (errorBox) errorBox.style.display = 'none'; }, 5000);
}
