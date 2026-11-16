const statusEl = document.getElementById('status');
const btn = document.getElementById('shareBtn');

btn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    statusEl.textContent = 'متصفحك لا يدعم تحديد الموقع.';
    return;
  }
  btn.disabled = true;
  statusEl.textContent = 'جارٍ طلب الإذن من المتصفح...';

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      statusEl.textContent = 'تم استلام الإحداثيات، جارٍ الإرسال...';
      try {
        const res = await fetch('/api/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: new Date().toISOString(),
            consent: true,
            permitId: 'TEST-001'
          })
        });
        if (res.ok) statusEl.textContent = 'تم الإرسال بنجاح. شكراً لتعاونك.';
        else statusEl.textContent = 'فشل الإرسال.';
      } catch (e) {
        statusEl.textContent = 'خطأ في الاتصال بالسيرفر.';
      }
    },
    (err) => {
      statusEl.textContent = 'لم يتم مشاركة الموقع (تم الرفض أو انتهت المهلة).';
      btn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
});