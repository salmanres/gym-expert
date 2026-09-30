const { Server } = require('socket.io');
const ActivityLog = require('./models/ActivityLog');

let io = null;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE']
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);

        socket.on('join_gym', (gymId) => {
            if (gymId) {
                const roomName = `gym_${gymId}`;
                socket.join(roomName);
                console.log(`📡 Socket ${socket.id} joined room: ${roomName}`);
            }
        });

        socket.on('join_superadmin', () => {
            socket.join('superadmin_room');
            console.log(`📡 Socket ${socket.id} joined room: superadmin_room`);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

// Helper function to send real-time notification to a specific gym & save to DB
const notifyGym = async (gymId, { title, description, type = 'SYSTEM', targetId = null, link = '' }) => {
    if (!gymId) return null;

    try {
        // 1. Save to ActivityLog DB
        const log = await ActivityLog.create({
            gymId,
            title,
            description,
            type,
            targetId,
            link,
            isRead: false
        });

        // 2. Emit real-time notification to Socket room
        if (io) {
            const roomName = `gym_${gymId}`;
            io.to(roomName).emit('new_notification', log);
            io.to('superadmin_room').emit('new_notification', log); // Send to superadmin too
            console.log(`🔔 Broadcasted notification to ${roomName} and superadmin:`, title);
        }

        return log;
    } catch (error) {
        console.error('Error sending gym notification:', error);
        return null;
    }
};

const getIo = () => io;

module.exports = {
    initSocket,
    notifyGym,
    getIo
};
