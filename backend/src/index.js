require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const apiRoutes = require('./routes/api');
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
    methods: ['GET', 'POST'],
  },
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
  })
);
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'Chat server running 🚀', time: new Date() });
});

// ─── Socket handler ───────────────────────────────────────────────────────────
socketHandler(io, app);

// ─── MongoDB ──────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp';

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');

    // Ensure admin user exists on startup
    const User = require('./models/User');
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.create({ name: 'Admin', role: 'admin' });
      console.log('✅ Admin user created:', admin._id);
    } else {
      console.log('✅ Admin user found:', admin._id);
    }
    app.set('adminId', admin._id);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
