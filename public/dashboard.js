async function loadData() {
  try {
    const response = await fetch('/api/get-locations');
    const data = await response.json();
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = ''; // تفريغ الجدول قبل التحديث

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">لا توجد بيانات مسجلة حتى الآن.</td></tr>';
      return;
    }

    data.forEach(item => {
      // تحويل التاريخ لشكل مقروء
      const date = new Date(item.timestamp).toLocaleString('ar-EG');
      
      // رابط جوجل ماب
      const mapUrl = `https://www.google.com/maps?q=${item.lat},${item.lng}`;

      // تجهيز عمود الدقة مع علامة تحذير لو الدقة منخفضة
      let accuracyCell = item.accuracy || 'غير متوفر';
      if (typeof item.accuracy === 'number' && item.accuracy > 50) {
        accuracyCell = `${item.accuracy} <span class="low-accuracy" title="دقة منخفضة، يُنصح بإعادة المحاولة في مكان مفتوح">⚠️</span>`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${date}</td>
        <td>${item.lat}</td>
        <td>${item.lng}</td>
        <td>${accuracyCell}</td>
        <td>${item.permitId}</td>
        <td>${item.ip || 'غير متوفر'}</td>
        <td><a href="${mapUrl}" target="_blank" class="map-link">فتح الخريطة 🗺️</a></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("خطأ في جلب البيانات:", error);
    alert("حدث خطأ أثناء جلب البيانات.");
  }
}

// تحميل البيانات أول ما الصفحة تفتح
loadData();

// ربط زرار التحديث بالوظيفة
document.getElementById('refreshBtn').addEventListener('click', loadData);

document.getElementById('clearBtn').addEventListener('click', async () => {
  const confirmDelete = confirm("هل أنت متأكد من مسح جميع البيانات؟");
  if (confirmDelete) {
    try {
      const response = await fetch('/api/clear-locations', { method: 'POST' });
      if (response.ok) {
        alert("تم مسح البيانات بنجاح!");
        loadData();
      } else {
        alert("حدث خطأ أثناء المسح.");
      }
    } catch (error) {
      alert("خطأ في الاتصال بالسيرفر.");
    }
  }
});