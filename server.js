const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

// Session configuration
app.use(session({
  secret: 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Default admin credentials (change in production)
const adminCredentials = {
  username: 'admin',
  password: 'admin123'
};

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ error: '需要登录' });
  }
}

// Load download links from JSON file
let downloadLinks = { android: '', ios: '' };
const linksFile = path.join(__dirname, 'downloadLinks.json');
if (fs.existsSync(linksFile)) {
  downloadLinks = JSON.parse(fs.readFileSync(linksFile, 'utf8'));
}

// Load app screenshots from JSON file
let appScreenshots = [];
const screenshotsFile = path.join(__dirname, 'screenshots.json');
if (fs.existsSync(screenshotsFile)) {
  appScreenshots = JSON.parse(fs.readFileSync(screenshotsFile, 'utf8'));
}

// Save screenshots to file
function saveScreenshots() {
  fs.writeFileSync(screenshotsFile, JSON.stringify(appScreenshots, null, 2));
}

// Load statistics from JSON file
let statistics = {
  visitors: 0,
  uniqueVisitors: 0,
  visitorIPs: new Set(),
  downloads: {
    android: 0,
    ios: 0,
    total: 0
  },
  dailyStats: {},
  lastUpdated: new Date().toISOString()
};
const statsFile = path.join(__dirname, 'statistics.json');
if (fs.existsSync(statsFile)) {
  const loadedStats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
  statistics = {
    ...loadedStats,
    visitorIPs: new Set(loadedStats.visitorIPs || [])
  };
  
  // Convert dailyStats visitorIPs arrays back to Sets
  if (statistics.dailyStats) {
    for (const [date, dayStats] of Object.entries(statistics.dailyStats)) {
      if (dayStats.visitorIPs && Array.isArray(dayStats.visitorIPs)) {
        statistics.dailyStats[date].visitorIPs = new Set(dayStats.visitorIPs);
      } else {
        statistics.dailyStats[date].visitorIPs = new Set();
      }
    }
  }
}

// Save statistics to file
function saveStatistics() {
  statistics.lastUpdated = new Date().toISOString();
  const statsToSave = {
    ...statistics,
    visitorIPs: Array.from(statistics.visitorIPs)
  };
  fs.writeFileSync(statsFile, JSON.stringify(statsToSave, null, 2));
}

// Get today's date string
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// Get client IP address
function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         '127.0.0.1';
}

// Visitor tracking middleware
app.use((req, res, next) => {
  // Only count visits to main page
  if (req.path === '/' && req.method === 'GET') {
    const clientIP = getClientIP(req);
    
    // Count total visitors
    statistics.visitors++;
    
    // Count unique visitors by IP
    if (!statistics.visitorIPs.has(clientIP)) {
      statistics.visitorIPs.add(clientIP);
      statistics.uniqueVisitors = statistics.visitorIPs.size;
    }
    
    // Daily statistics
    const today = getTodayString();
    if (!statistics.dailyStats[today]) {
      statistics.dailyStats[today] = { 
        visitors: 0, 
        uniqueVisitors: 0,
        visitorIPs: new Set(),
        downloads: { android: 0, ios: 0, total: 0 } 
      };
    }
    statistics.dailyStats[today].visitors++;
    
    // Daily unique visitors
    if (!statistics.dailyStats[today].visitorIPs.has(clientIP)) {
      statistics.dailyStats[today].visitorIPs.add(clientIP);
      statistics.dailyStats[today].uniqueVisitors = statistics.dailyStats[today].visitorIPs.size;
    }
    
    saveStatistics();
  }
  next();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === adminCredentials.username && password === adminCredentials.password) {
    req.session.authenticated = true;
    req.session.username = username;
    res.json({ success: true, message: '登录成功' });
  } else {
    res.status(401).json({ error: '用户名或密码错误' });
  }
});

// Logout endpoint
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: '登出失败' });
    } else {
      res.json({ success: true, message: '登出成功' });
    }
  });
});

// Check authentication status
app.get('/auth-status', (req, res) => {
  res.json({ 
    authenticated: !!(req.session && req.session.authenticated),
    username: req.session ? req.session.username : null
  });
});

app.get('/links', (req, res) => {
  res.json(downloadLinks);
});

// Get screenshots (public endpoint)
app.get('/screenshots', (req, res) => {
  res.json(appScreenshots);
});

// Upload screenshot
app.post('/upload-screenshot', requireAuth, upload.single('screenshot'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    const screenshot = {
      id: Date.now().toString(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      uploadTime: new Date().toISOString()
    };
    
    appScreenshots.push(screenshot);
    saveScreenshots();
    
    res.json({ success: true, screenshot });
  } catch (error) {
    res.status(500).json({ error: '上传失败: ' + error.message });
  }
});

// Delete screenshot
app.delete('/screenshot/:id', requireAuth, (req, res) => {
  try {
    const screenshotId = req.params.id;
    const screenshotIndex = appScreenshots.findIndex(s => s.id === screenshotId);
    
    if (screenshotIndex === -1) {
      return res.status(404).json({ error: '截图不存在' });
    }
    
    const screenshot = appScreenshots[screenshotIndex];
    const filePath = path.join(uploadsDir, screenshot.filename);
    
    // Delete file from disk
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Remove from array
    appScreenshots.splice(screenshotIndex, 1);
    saveScreenshots();
    
    res.json({ success: true, message: '截图已删除' });
  } catch (error) {
    res.status(500).json({ error: '删除失败: ' + error.message });
  }
});

// Upload logo
app.post('/upload-logo', requireAuth, upload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    const logoPath = path.join(uploadsDir, 'logo.png');
    
    // Delete existing logo if it exists
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
    }
    
    // Rename uploaded file to logo.png
    const uploadedFilePath = path.join(uploadsDir, req.file.filename);
    fs.renameSync(uploadedFilePath, logoPath);
    
    res.json({ success: true, message: 'Logo上传成功', url: '/uploads/logo.png' });
  } catch (error) {
    res.status(500).json({ error: '上传失败: ' + error.message });
  }
});

// Delete logo
app.delete('/delete-logo', requireAuth, (req, res) => {
  try {
    const logoPath = path.join(uploadsDir, 'logo.png');
    
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
      res.json({ success: true, message: 'Logo已删除' });
    } else {
      res.status(404).json({ error: 'Logo不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: '删除失败: ' + error.message });
  }
});

app.post('/update-links', requireAuth, (req, res) => {
  const { android, ios } = req.body;
  downloadLinks = { android, ios };
  fs.writeFileSync(linksFile, JSON.stringify(downloadLinks));
  res.sendStatus(200);
});

// Get statistics (admin only)
app.get('/statistics', requireAuth, (req, res) => {
  const statsToReturn = {
    ...statistics,
    visitorIPs: Array.from(statistics.visitorIPs),
    dailyStats: {}
  };
  
  // Convert daily stats Sets to arrays
  for (const [date, dayStats] of Object.entries(statistics.dailyStats)) {
    statsToReturn.dailyStats[date] = {
      ...dayStats,
      visitorIPs: dayStats.visitorIPs ? Array.from(dayStats.visitorIPs) : []
    };
  }
  
  res.json(statsToReturn);
});

// Record download
app.post('/download', (req, res) => {
  const { platform } = req.body;
  
  if (platform === 'android' || platform === 'ios') {
    statistics.downloads[platform]++;
    statistics.downloads.total++;
    
    // Daily statistics
    const today = getTodayString();
    if (!statistics.dailyStats[today]) {
      statistics.dailyStats[today] = { visitors: 0, downloads: { android: 0, ios: 0, total: 0 } };
    }
    statistics.dailyStats[today].downloads[platform]++;
    statistics.dailyStats[today].downloads.total++;
    
    saveStatistics();
    res.json({ success: true, platform, downloads: statistics.downloads });
  } else {
    res.status(400).json({ error: 'Invalid platform' });
  }
});

// Reset statistics (admin only)
app.post('/reset-statistics', requireAuth, (req, res) => {
  statistics = {
    visitors: 0,
    uniqueVisitors: 0,
    visitorIPs: new Set(),
    downloads: {
      android: 0,
      ios: 0,
      total: 0
    },
    dailyStats: {},
    lastUpdated: new Date().toISOString()
  };
  saveStatistics();
  res.json({ success: true, message: '统计数据已重置' });
});

// Serve static files (after all API routes)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});