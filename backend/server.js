require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL
}));
app.use(express.json());

// ─── Config ───────────────────────────────────────────────────────────────────
const {
  SMTP_HOST = 'smtp.gmail.com',
  SMTP_PORT = '587',
  SMTP_USER = '',
  SMTP_PASSWORD = '',
  SMTP_FROM = SMTP_USER,
  JWT_SECRET = 'beumer_default_secret_change_me',
  MONGODB_URL = 'mongodb://localhost:27017',
  DATABASE_NAME = 'beumer_feedback',
  PORT = 8000
} = process.env;

// ─── MongoDB ──────────────────────────────────────────────────────────────────
const feedbackSchema = new mongoose.Schema({
  sectionA: Object,
  sectionB: Object,
  sectionC: Object,
  sectionD_FillPac: Array,
  sectionD_BucketElevator: Array,
  submitted_by: String,
  created_at: { type: Date, default: Date.now }
});
const Feedback = mongoose.model('Feedback', feedbackSchema);

mongoose.connect(MONGODB_URL, { dbName: DATABASE_NAME })
  .then(() => console.log(`✅ Connected to MongoDB: ${DATABASE_NAME}`))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

// ─── In-memory OTP Store ──────────────────────────────────────────────────────
const otpStore = new Map(); // email -> { otp, expiresAt, requestedAt }

function cleanupExpiredOtps() {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (now > record.expiresAt) otpStore.delete(email);
  }
}

// ─── Email Transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: parseInt(SMTP_PORT),
  secure: parseInt(SMTP_PORT) === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASSWORD }
});

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

async function sendOtpEmail(toEmail, otp) {
  const html = `
    <html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:30px;">
      <div style="background:white;border-radius:8px;padding:30px;max-width:480px;margin:auto;">
        <h2 style="color:#003399;">Beumer Digitalization</h2>
        <p>Your email verification code is:</p>
        <div style="font-size:2.5rem;font-weight:bold;letter-spacing:10px;color:#003399;
                    background:#f0f4ff;padding:20px;border-radius:8px;text-align:center;">
          ${otp}
        </div>
        <p style="color:#888;margin-top:20px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color:#888;font-size:0.85rem;">If you didn't request this, please ignore this email.</p>
      </div>
    </body></html>
  `;
  await transporter.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: toEmail,
    subject: 'Your Beumer Feedback Verification Code',
    html
  });
}

// ─── JWT Helpers ──────────────────────────────────────────────────────────────
function createToken(email) {
  return jwt.sign({ sub: email }, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Authorization header missing.' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    req.userEmail = payload.sub;
    next();
  } catch (e) {
    const msg = e.name === 'TokenExpiredError'
      ? 'Session expired. Please verify your email again.'
      : 'Invalid session. Please verify your email again.';
    res.status(401).json({ detail: msg });
  }
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Send OTP
app.post('/api/send-otp', async (req, res) => {
  cleanupExpiredOtps();
  const { email } = req.body;
  if (!email) return res.status(400).json({ detail: 'Email is required.' });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ detail: 'Invalid email format.' });
  if (!SMTP_USER || !SMTP_PASSWORD) {
    return res.status(500).json({ detail: 'Mail server is not configured. Please contact administrator.' });
  }

  const existing = otpStore.get(email);
  if (existing) {
    const age = Date.now() - existing.requestedAt;
    if (age < 60000) {
      const remaining = Math.ceil((60000 - age) / 1000);
      return res.status(429).json({ detail: `Please wait ${remaining} seconds before requesting a new code.` });
    }
  }

  try {
    const otp = generateOtp();
    await sendOtpEmail(email, otp);
    otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60000, requestedAt: Date.now() });
    console.log(`OTP sent to ${email}`);
    res.json({ status: 'success', message: `OTP sent to ${email}` });
  } catch (err) {
    console.error('Send OTP error:', err.message);
    res.status(500).json({ detail: 'Failed to send OTP. Please try again.' });
  }
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);
  if (!record) return res.status(400).json({ detail: 'No OTP found for this email. Please request a new one.' });
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ detail: 'OTP has expired. Please request a new one.' });
  }
  if (otp !== record.otp) return res.status(400).json({ detail: 'Incorrect OTP. Please try again.' });

  otpStore.delete(email);
  const access_token = createToken(email);
  res.json({ status: 'success', message: 'Email verified successfully!', access_token, token_type: 'bearer' });
});

// Submit Feedback
app.post('/api/submit-feedback', verifyToken, async (req, res) => {
  try {
    const feedback = new Feedback({
      ...req.body,
      submitted_by: req.userEmail,
      created_at: new Date()
    });
    const result = await feedback.save();
    console.log(`Feedback saved from ${req.userEmail}: ${result._id}`);
    res.json({ status: 'success', message: 'Feedback saved successfully', id: result._id });
  } catch (err) {
    console.error('Submit feedback error:', err.message);
    res.status(500).json({ detail: 'Internal server error while saving feedback.' });
  }
});

// ─── Serve Angular Build (Production) ────────────────────────────────────────
const distPath = path.join(__dirname, '../frontend/dist/frontend/browser');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('BEUMER FEEDBACK API - Node.js Backend');
  console.log('='.repeat(50));
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`SMTP Host:  ${SMTP_HOST}:${SMTP_PORT}`);
  console.log(`SMTP User:  ${SMTP_USER || '[NOT SET]'}`);
  console.log(`MongoDB:    ${DATABASE_NAME}`);
  console.log('='.repeat(50) + '\n');
});
