document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('errorMsg');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      window.location.href = '/dashboard.html'; // نوديه على اللوحة
    } else {
      errorMsg.style.display = 'block';
    }
  } catch (err) {
    alert('حدث خطأ في الاتصال');
  }
});