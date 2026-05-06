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

// ─── Validate Required ENV ───────────────────────────────────────────────
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in environment variables');
  process.exit(1);
}

// ─── Socket.io ───────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
    methods: ['GET', 'POST'],
  },
});

// ─── Middleware ──────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : '*',
  })
);

app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'Chat server running 🚀', time: new Date() });
});

// ─── Socket Handler ──────────────────────────────────────────────────────
socketHandler(io, app);

// ─── Start Server After DB Connect ───────────────────────────────────────
const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Ensure admin exists
    const User = require('./models/User');
    let admin = await User.findOne({ role: 'admin' });

    if (!admin) {
      admin = await User.create({ name: 'Admin', role: 'admin' });
      console.log('✅ Admin user created:', admin._id);
    } else {
      console.log('✅ Admin user found:', admin._id);
    }

    app.set('adminId', admin._id);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

startServer();