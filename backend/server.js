require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { initSocket } = require('./socket');

const authRoutes = require('./routes/authRoutes');
const gymRoutes = require('./routes/gymRoutes');
const branchRoutes = require('./routes/branchRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const memberRoutes = require('./routes/memberRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const memberMembershipRoutes = require('./routes/memberMembershipRoutes');
const staffRoutes = require('./routes/staffRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const trialAttendanceRoutes = require('./routes/trialAttendanceRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/gyms', gymRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/membership-plans', membershipRoutes);
app.use('/api/member-memberships', memberMembershipRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/trial-attendance', trialAttendanceRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// Basic Route for testing
app.get('/', (req, res) => {
    res.send('Gym Management API is running...');
});

const { autoCheckoutOverdueAttendance } = require('./controllers/attendanceController');

// Background job: Auto checkout open attendances older than 3 hours (runs every 60s)
setInterval(() => {
    autoCheckoutOverdueAttendance().catch(err => console.error('Auto checkout interval error:', err));
}, 60000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server & Socket.io running on port ${PORT}`);
    // Run an initial check on startup
    autoCheckoutOverdueAttendance().catch(err => console.error('Initial auto checkout check error:', err));
});
