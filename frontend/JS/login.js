const API_BASE = 'http://localhost:3000/api/v1';

if (localStorage.getItem('token')) {
  window.location.href = 'geo_admin.html';
}

async function submitLogin() {
  const email = document.getElementById('email')?.value.trim();
  const senha = document.getElementById('senha')?.value.trim();
  const errorBox = document.getElementById('login-error');

  if (!email || !senha) {
    showError('Preencha e-mail e senha.');
    return;
  }

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
  }
}

function showError(message) {
  const errorBox = document.getElementById('login-error');
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.style.display = 'block';
}
