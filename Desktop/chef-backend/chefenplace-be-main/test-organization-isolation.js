const mongoose = require('mongoose');
const User = require('./database/models/User');
const Recipe = require('./database/models/Recipe');
const Plateup = require('./database/models/plateup');
const Notification = require('./database/models/Notification');

async function testOrganizationIsolation() {
  console.log('🧪 Testing organization isolation...\n');
  
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/chef-en-place";
    await mongoose.connect(mongoUri);
    
    // Find some test users
    const headchefs = await User.find({ role: 'head-chef' }).limit(2);
    const teamMembers = await User.find({ role: 'team-member' }).limit(2);
    
    console.log(`Found ${headchefs.length} headchefs and ${teamMembers.length} team members`);
    
    if (headchefs.length < 2 || teamMembers.length < 1) {
      console.log('❌ Need at least 2 headchefs and 1 team member for testing');
      return;
    }
    
    const headchef1 = headchefs[0];
    const headchef2 = headchefs[1];
    const teamMember = teamMembers[0];
    
    console.log('\n📊 User Details:');
    console.log(`Headchef 1: ${headchef1.email} (ID: ${headchef1._id})`);
    console.log(`Headchef 2: ${headchef2.email} (ID: ${headchef2._id})`);
    console.log(`Team Member: ${teamMember.email} (HeadChefId: ${teamMember.headChefId})`);
    
    // Check which headchef the team member belongs to
    const teamMemberHeadchef = headchef1._id.equals(teamMember.headChefId) ? headchef1 : headchef2;
    const otherHeadchef = headchef1._id.equals(teamMember.headChefId) ? headchef2 : headchef1;
    
    console.log(`\n🔗 Team member belongs to: ${teamMemberHeadchef.email}`);
    
    // Test Recipe isolation
    console.log('\n📝 Testing Recipe Isolation:');
    const teamMemberRecipes = await Recipe.find({ headChefId: teamMember.headChefId });
    const otherHeadchefRecipes = await Recipe.find({ headChefId: otherHeadchef._id });
    
    console.log(`Team member's headchef recipes: ${teamMemberRecipes.length}`);
    console.log(`Other headchef's recipes: ${otherHeadchefRecipes.length}`);
    
    // Test Plateup isolation
    console.log('\n🍽️ Testing Plateup Isolation:');
    const teamMemberPlateups = await Plateup.find({ headChefId: teamMember.headChefId });
    const otherHeadchefPlateups = await Plateup.find({ headChefId: otherHeadchef._id });
    
    console.log(`Team member's headchef plateups: ${teamMemberPlateups.length}`);
    console.log(`Other headchef's plateups: ${otherHeadchefPlateups.length}`);
    
    // Test Notification isolation
    console.log('\n🔔 Testing Notification Isolation:');
    const teamMemberNotifications = await Notification.find({ headChefId: teamMember.headChefId });
    const otherHeadchefNotifications = await Notification.find({ headChefId: otherHeadchef._id });
    
    console.log(`Team member's headchef notifications: ${teamMemberNotifications.length}`);
    console.log(`Other headchef's notifications: ${otherHeadchefNotifications.length}`);
    
    console.log('\n✅ Organization isolation test completed!');
    console.log('📋 Summary: Team members should only see content from their headchef');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testOrganizationIsolation();
