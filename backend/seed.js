require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('MongoDB Connected for Seeding...');

        const superAdminExists = await User.findOne({ role: 'SUPERADMIN' });
        if (superAdminExists) {
            console.log('SuperAdmin already exists!');
            process.exit(0);
        }

        await User.create({
            name: 'System Admin',
            email: 'superadmin@gym.com',
            password: 'superpassword123',
            role: 'SUPERADMIN'
        });

        console.log('SuperAdmin credentials created successfully:');
        console.log('Email: superadmin@gym.com');
        console.log('Password: superpassword123');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding SuperAdmin:', error);
        process.exit(1);
    }
};

seedSuperAdmin();
