// Test script for Reports System
// Run this in browser console to test offline functionality

console.log('🧪 Testing NabhaCare Reports System...');

// Test offline storage initialization
async function testOfflineStorage() {
  try {
    console.log('📦 Testing offline storage...');
    
    // Import the offline storage service
    const { default: offlineStorage } = await import('./src/services/offlineStorage.js');
    
    // Initialize
    await offlineStorage.init();
    console.log('✅ Offline storage initialized');
    
    // Test saving a report
    const testReport = {
      id: 'test_report_123',
      patientId: 'test_patient',
      title: 'Test Report',
      reportType: 'lab',
      description: 'This is a test report',
      date: new Date(),
      fileName: 'test.pdf',
      fileType: 'application/pdf',
      fileData: 'data:application/pdf;base64,test',
      fileSize: 1024,
      status: 'active'
    };
    
    await offlineStorage.saveReport(testReport);
    console.log('✅ Test report saved offline');
    
    // Test retrieving reports
    const reports = await offlineStorage.getReports('test_patient');
    console.log('✅ Retrieved reports:', reports.length);
    
    // Test storage info
    const info = await offlineStorage.getStorageInfo();
    console.log('✅ Storage info:', info);
    
    return true;
  } catch (error) {
    console.error('❌ Offline storage test failed:', error);
    return false;
  }
}

// Test sync service
async function testSyncService() {
  try {
    console.log('🔄 Testing sync service...');
    
    // Import the sync service
    const { default: syncService } = await import('./src/services/syncService.js');
    
    // Test sync status
    const status = await syncService.getSyncStatus();
    console.log('✅ Sync status:', status);
    
    return true;
  } catch (error) {
    console.error('❌ Sync service test failed:', error);
    return false;
  }
}

// Test API functions
async function testAPI() {
  try {
    console.log('🌐 Testing API functions...');
    
    // Import API functions
    const { 
      createReport, 
      getPatientReports, 
      reportsCollection 
    } = await import('./src/services/api.js');
    
    console.log('✅ API functions imported');
    console.log('✅ Reports collection:', reportsCollection);
    
    return true;
  } catch (error) {
    console.error('❌ API test failed:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive tests...');
  
  const results = await Promise.allSettled([
    testOfflineStorage(),
    testSyncService(),
    testAPI()
  ]);
  
  const passed = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Reports system is ready.');
  } else {
    console.log('⚠️ Some tests failed. Check the errors above.');
  }
}

// Export for manual testing
window.testReportsSystem = {
  testOfflineStorage,
  testSyncService,
  testAPI,
  runAllTests
};

console.log('💡 Run window.testReportsSystem.runAllTests() to test the system');
