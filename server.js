require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo').default || require('connect-mongo');
const app = express();
app.set('trust proxy', true);
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json({ limit: '2kb' }));
app.use(express.urlencoded({ extended: true }));

// --- قاعدة البيانات ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err.message));

const Location = mongoose.model(
  'Location',
  new mongoose.Schema({}, { strict: false })
);

// --- الجلسات ---
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8
  }
}));

// --- حماية لوحة التحكم ---
app.get('/dashboard.html', (req, res, next) => {
  if (req.session.loggedIn) next();
  else res.redirect('/login.html');
});

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password && password === process.env.ADMIN_PASSWORD) {
    req.session.loggedIn = true;
    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err.message);
        return res.status(500).json({ error: 'فشل حفظ الجلسة' });
      }
      res.json({ ok: true });
    });
  } else {
    res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
  }
});

app.get('/api/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login.html'));
});

app.use(express.static('public'));

function validate(body) {
  if (body.consent !== true) return 'no consent';
  if (typeof body.lat !== 'number' || body.lat < -90 || body.lat > 90) return 'bad lat';
  if (typeof body.lng !== 'number' || body.lng < -180 || body.lng > 180) return 'bad lng';
  if (typeof body.permitId !== 'string' || !body.permitId) return 'no permit';
  return null;
}

app.post('/api/location', async (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  try {
    await Location.create({
      receivedAt: new Date().toISOString(),
      ip: req.ip,
      ua: req.headers['user-agent'],
      ...req.body
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'فشل الحفظ' });
  }
});

app.get('/api/get-locations', async (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const data = await Location.find().sort({ _id: -1 }).lean();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'فشل جلب البيانات' });
  }
});

app.post('/api/clear-locations', async (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await Location.deleteMany({});
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'فشل المسح' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));