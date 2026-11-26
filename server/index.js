const express = require('express');
const path = require('node:path');
const validator = require('validator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

app.post('/api/validate-url', (req, res) => {
  const raw = typeof req.body?.url === 'string' ? req.body.url.trim() : '';

  if (!raw) {
    return res.status(400).json({
      valid: false,
      error: 'Please enter a website link first.',
    });
  }

  const normalizedUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const valid = validator.isURL(normalizedUrl, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
    require_tld: true,
    allow_underscores: true,
  });

  if (!valid) {
    return res.status(400).json({
      valid: false,
      error: 'That doesn’t look like a valid website link (e.g., example.com).',
    });
  }

  const hostname = new URL(normalizedUrl).hostname
    .replace(/^www\./i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return res.json({
    valid: true,
    normalizedUrl,
    wasAutoPrefixed: normalizedUrl !== raw,
    suggestedFilename: `qr-${hostname || 'code'}`,
  });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`QR Studio running on http://localhost:${PORT}`);
  });
}

module.exports = app;
