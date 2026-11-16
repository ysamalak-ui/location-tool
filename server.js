const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const session = require('express-session'); // مكتبة الجلسات

const app = express();
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json({ limit: '2kb' }));
app.use(express.urlencoded({ extended: true })); // عشان نقرا الفورم

// إعداد الجلسات (لحماية لوحة التحكم)
app.use(session({
  secret: 'super-secret-key-change-this-later', 
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // نخليها true لو شغالين على HTTPS
}));

// --- حماية لوحة التحكم ---
// أي حد بيحاول يفتح dashboard.html من غير تسجيل دخول، هيتحول لصفحة الـ login
app.get('/dashboard.html', (req, res, next) => {
  if (req.session.loggedIn) {
    next(); // مسموحله يدخل
  } else {
    res.redirect('/login.html'); // اطرده على صفحة الدخول
  }
});

// مسار تسجيل الدخول
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  // كلمة المرور الافتراضية (تقدر تغيرها لأي حاجة)
  if (password === 'admin123') {
    req.session.loggedIn = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
  }
});

// مسار تسجيل الخروج
app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

// --- مسارات البيانات القديمة ---
app.use(express.static('public'));

const LOG = path.join(__dirname, 'locations.ndjson');

function validate(body) {
  if (body.consent !== true) return 'no consent';
  if (typeof body.lat !== 'number' || body.lat < -90 || body.lat > 90) return 'bad lat';
  if (typeof body.lng !== 'number' || body.lng < -180 || body.lng > 180) return 'bad lng';
  if (typeof body.permitId !== 'string' || !body.permitId) return 'no permit';
  return null;
}

app.post('/api/location', (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });

  const record = {
    receivedAt: new Date().toISOString(),
    ip: req.ip,
    ua: req.headers['user-agent'],
    ...req.body
  };

  fs.appendFileSync(LOG, JSON.stringify(record) + '\n');
  res.json({ ok: true });
});

app.get('/api/get-locations', (req, res) => {
  // تأمين الـ API نفسه عشان محدش يسرق البيانات
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (fs.existsSync(LOG)) {
    const data = fs.readFileSync(LOG, 'utf8')
      .trim().split('\n').filter(line => line)
      .map(line => JSON.parse(line));
    res.json(data.reverse());
  } else {
    res.json([]);
  }
});

app.post('/api/clear-locations', (req, res) => {
  // تأمين زرار المسح
  if (!req.session.loggedIn) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (fs.existsSync(LOG)) fs.writeFileSync(LOG, '');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'فشل المسح' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));