require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const updateSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        let admin = await User.findOne({ role: 'SUPERADMIN' });
        
        if (admin) {
            admin.email = 'admin@gmail.com';
            admin.password = '123456';
            await admin.save();
            console.log('SuperAdmin updated successfully!');
        } else {
            await User.create({
                name: 'System Admin',
                email: 'admin@gmail.com',
                password: '123456',
                role: 'SUPERADMIN'
            });
            console.log('SuperAdmin created successfully!');
        }
        
        // Also update seed.js to reflect the changes for future use
        process.exit(0);
    } catch (error) {
        console.error('Error updating SuperAdmin:', error);
        process.exit(1);
    }
};

updateSuperAdmin();
