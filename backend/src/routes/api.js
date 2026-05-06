const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');

// POST /create-student
router.post('/create-student', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if a student with this name already exists (allow reconnect)
    let student = await User.findOne({ name: name.trim(), role: 'student' });
    if (!student) {
      student = await User.create({ name: name.trim(), role: 'student' });
    }

    res.status(201).json({
      userId: student._id,
      name: student.name,
      role: student.role,
      createdAt: student.createdAt,
    });
  } catch (err) {
    console.error('create-student error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /students
router.get('/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).sort({ createdAt: -1 });

    // For each student, get unread message count (student → admin, unread)
    const adminId = req.app.get('adminId');

    const studentsWithMeta = await Promise.all(
      students.map(async (student) => {
        const unreadCount = adminId
          ? await Message.countDocuments({
              senderId: student._id,
              receiverId: adminId,
              read: false,
            })
          : 0;

        return {
          _id: student._id,
          name: student.name,
          online: student.online,
          createdAt: student.createdAt,
          unreadCount,
        };
      })
    );

    res.json(studentsWithMeta);
  } catch (err) {
    console.error('students error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /messages/:userId — full conversation between admin and student
router.get('/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.app.get('adminId');

    if (!adminId) {
      return res.status(503).json({ error: 'Admin not registered yet' });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: adminId },
        { senderId: adminId, receiverId: userId },
      ],
    }).sort({ timestamp: 1 });

    // Mark messages from student as read
    await Message.updateMany(
      { senderId: userId, receiverId: adminId, read: false },
      { $set: { read: true } }
    );

    res.json(messages);
  } catch (err) {
    console.error('messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /admin — get or create admin user
router.get('/admin', async (req, res) => {
  try {
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.create({ name: 'Admin', role: 'admin' });
    }
    res.json({ _id: admin._id, name: admin.name, role: admin.role });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
