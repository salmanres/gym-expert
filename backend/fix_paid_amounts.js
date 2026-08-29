require('dotenv').config();
const mongoose = require('mongoose');
const MemberMembership = require('./models/MemberMembership');
const Transaction = require('./models/Transaction');

async function fixAmounts() {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://zebsoft:KO1yATRwKBt4sJ1y@zebsoft.iyoy4go.mongodb.net/gym-management';
    console.log("Connecting to Mongo URI...");
    await mongoose.connect(mongoUri);
    console.log("Connected to database...");

    const memberships = await MemberMembership.find();
    console.log(`Found ${memberships.length} memberships...`);
    for (let mem of memberships) {
        const txs = await Transaction.find({ memberId: mem.memberId, planId: mem.membershipPlanId });
        if (txs.length > 0) {
            const sumTx = txs.reduce((acc, t) => acc + (t.amountPaid || 0), 0);
            if (sumTx > 0 && Math.abs(mem.paidAmount - sumTx) > 0.01) {
                console.log(`Fixing membership ${mem._id} (${mem.planName}): old paidAmount ${mem.paidAmount} -> new paidAmount ${sumTx}`);
                mem.paidAmount = sumTx;
                mem.balanceAmount = Math.max(0, mem.finalPrice - sumTx);
                await mem.save();
            }
        }
    }
    console.log("Fix completed successfully!");
    process.exit(0);
}

fixAmounts().catch(err => {
    console.error("Error fixing amounts:", err);
    process.exit(1);
});
