const User = require('../models/User');
const Message = require('../models/Message');

// Map: userId (string) → socketId
const connectedUsers = new Map();

module.exports = (io, app) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // ─── Register user ────────────────────────────────────────────────────────
    socket.on('register', async ({ userId, role }) => {
      try {
        connectedUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.userRole = role;

        await User.findByIdAndUpdate(userId, { online: true });

        // If this is the admin, store adminId in app
        if (role === 'admin') {
          app.set('adminId', userId);
        }

        console.log(`User registered: ${userId} (${role})`);

        // Notify admin that a student came online
        if (role === 'student') {
          const adminId = app.get('adminId');
          if (adminId) {
            const adminSocketId = connectedUsers.get(String(adminId));
            if (adminSocketId) {
              io.to(adminSocketId).emit('studentStatusChange', {
                userId,
                online: true,
              });
            }
          }
        }

        socket.emit('registered', { success: true });
      } catch (err) {
        console.error('register error:', err);
        socket.emit('error', { message: 'Registration failed' });
      }
    });

    // ─── Send message ─────────────────────────────────────────────────────────
    socket.on('sendMessage', async ({ senderId, receiverId, message }) => {
      try {
        if (!message || !message.trim()) return;

        const newMessage = await Message.create({
          senderId,
          receiverId,
          message: message.trim(),
          timestamp: new Date(),
          read: false,
        });

        const populated = await Message.findById(newMessage._id);
        const msgPayload = {
          _id: populated._id,
          senderId: populated.senderId,
          receiverId: populated.receiverId,
          message: populated.message,
          timestamp: populated.timestamp,
          read: populated.read,
        };

        // Send to receiver
        const receiverSocketId = connectedUsers.get(String(receiverId));
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('newMessage', msgPayload);
        }

        // Echo back to sender (confirm delivery)
        socket.emit('messageSent', msgPayload);

        // Update unread count for admin
        const adminId = app.get('adminId');
        if (adminId) {
          const adminSocketId = connectedUsers.get(String(adminId));
          if (adminSocketId) {
            const unreadCount = await Message.countDocuments({
              senderId,
              receiverId: adminId,
              read: false,
            });
            io.to(adminSocketId).emit('unreadUpdate', {
              studentId: senderId,
              unreadCount,
            });
          }
        }
      } catch (err) {
        console.error('sendMessage error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ─── Typing indicator ─────────────────────────────────────────────────────
    socket.on('typing', ({ senderId, receiverId, isTyping }) => {
      const receiverSocketId = connectedUsers.get(String(receiverId));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typingIndicator', { senderId, isTyping });
      }
    });

    // ─── Mark messages as read ────────────────────────────────────────────────
    socket.on('markRead', async ({ studentId }) => {
      try {
        const adminId = app.get('adminId');
        if (!adminId) return;

        await Message.updateMany(
          { senderId: studentId, receiverId: adminId, read: false },
          { $set: { read: true } }
        );

        // Tell admin unread is now 0
        const adminSocketId = connectedUsers.get(String(adminId));
        if (adminSocketId) {
          io.to(adminSocketId).emit('unreadUpdate', {
            studentId,
            unreadCount: 0,
          });
        }
      } catch (err) {
        console.error('markRead error:', err);
      }
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      try {
        const { userId, userRole } = socket;
        if (userId) {
          connectedUsers.delete(userId);
          await User.findByIdAndUpdate(userId, { online: false });

          console.log(`User disconnected: ${userId}`);

          // Notify admin
          if (userRole === 'student') {
            const adminId = app.get('adminId');
            if (adminId) {
              const adminSocketId = connectedUsers.get(String(adminId));
              if (adminSocketId) {
                io.to(adminSocketId).emit('studentStatusChange', {
                  userId,
                  online: false,
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('disconnect error:', err);
      }
    });
  });
};
