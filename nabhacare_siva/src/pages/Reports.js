import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import syncService from '../services/syncService';
import { getUser, subscribeToSharedReports } from '../services/api';
import toast from 'react-hot-toast';

const Reports = () => {
  const { userProfile } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [searchedPatient, setSearchedPatient] = useState(null);
  const [showPatientSearch, setShowPatientSearch] = useState(false);

  // Form state for new report
  const [newReport, setNewReport] = useState({
    title: '',
    reportType: 'lab',
    description: '',
    file: null,
    date: new Date().toISOString().split('T')[0],
    patientId: ''
  });

  const updateSyncStatus = async () => {
    try {
      const status = await syncService.getSyncStatus();
      console.log('Sync status updated:', status);
      setSyncStatus(status);
    } catch (error) {
      console.error('Error getting sync status:', error);
    }
  };

  const handleManualSync = async () => {
    try {
      console.log('Manual sync triggered...');
      
      // Check sync queue before sync
      const offlineStorage = (await import('../utils/enhancedOfflineStorage')).default;
      await offlineStorage.initialize();
      const syncQueue = await offlineStorage.getSyncQueue();
      console.log('Sync queue before manual sync:', syncQueue);
      
      await syncService.manualSync();
      
      // Check sync queue after sync
      const syncQueueAfter = await offlineStorage.getSyncQueue();
      console.log('Sync queue after manual sync:', syncQueueAfter);
      
      await fetchReports();
      await updateSyncStatus();
      toast.success('Manual sync completed successfully!');
    } catch (error) {
      console.error('Manual sync failed:', error);
      toast.error('Manual sync failed: ' + error.message);
    }
  };


  const fetchReports = useCallback(async (patientId = null, forcePatientMode = false) => {
    try {
      setLoading(true);
      const targetPatientId = patientId || userProfile.id;
      const doctorId = (!forcePatientMode && userProfile?.role === 'doctor') ? userProfile.id : null;
      
      console.log('Fetching reports for:', { targetPatientId, doctorId, isOnline: navigator.onLine });
      
      let reportsData = [];
      
      // Always try to get reports from sync service first (handles both online and offline)
      try {
        reportsData = await syncService.getReportsWithOfflineSupport(targetPatientId, doctorId);
        console.log('Reports fetched from sync service:', reportsData);
      } catch (syncError) {
        console.warn('Failed to get reports from sync service:', syncError);
      }
      
      // If no reports from sync service, try direct offline storage
      if (!reportsData || reportsData.length === 0) {
        console.log('No reports from sync service, trying direct offline storage...');
        try {
          const offlineStorage = (await import('../utils/enhancedOfflineStorage')).default;
          await offlineStorage.initialize();
          const cachedReports = await offlineStorage.getReports();
          console.log('Direct cached reports:', cachedReports);
          
          if (cachedReports && cachedReports.length > 0) {
            reportsData = cachedReports;
          }
        } catch (offlineError) {
          console.warn('Failed to get reports from direct offline storage:', offlineError);
        }
      }
      
      // Filter reports based on user role and permissions
      if (reportsData && reportsData.length > 0) {
        let filteredReports = reportsData;
        
        // If patient, only show their own reports
        if (userProfile?.role === 'patient') {
          filteredReports = reportsData.filter(report => 
            report.patientId === userProfile.id
          );
        }
        // If doctor, show reports they created or are assigned to
        else if (userProfile?.role === 'doctor') {
          filteredReports = reportsData.filter(report => 
            report.doctorId === userProfile.id || report.patientId === targetPatientId
          );
        }
        
        console.log('Filtered reports for display:', filteredReports);
        setReports(filteredReports);
      } else {
        console.log('No reports found for user');
        setReports([]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to fetch reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    const handleOnlineStatus = () => {
      const wasOffline = !isOnline;
      const nowOnline = navigator.onLine;
      setIsOnline(nowOnline);
      
      console.log('Network status changed:', { wasOffline, nowOnline });
      
      // If we just came back online, trigger sync
      if (wasOffline && nowOnline) {
        console.log('Network came back online, triggering sync...');
        setTimeout(async () => {
          try {
            console.log('Starting sync after coming online...');
            await syncService.manualSync();
            console.log('Sync completed after coming online');
            await fetchReports();
            await updateSyncStatus();
            toast.success('Data synced successfully!');
          } catch (error) {
            console.error('Failed to sync after coming online:', error);
            toast.error('Sync failed after coming online');
          }
        }, 2000); // Wait 2 seconds for network to stabilize
      }
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [isOnline]);

  useEffect(() => {
    if (userProfile?.id) {
      // Initialize sync service and offline storage
      const initializeServices = async () => {
        try {
          console.log('Initializing sync service in Reports page...');
          await syncService.initialize();
          console.log('Sync service initialized in Reports page');
          
          // Check if we have pending sync items
          const offlineStorage = (await import('../utils/enhancedOfflineStorage')).default;
          await offlineStorage.initialize();
          const syncQueue = await offlineStorage.getSyncQueue();
          console.log('Current sync queue on page load:', syncQueue);
          
        } catch (error) {
          console.error('Failed to initialize sync service in Reports:', error);
        }
      };
      
      initializeServices();
      fetchReports();
      updateSyncStatus();
    }
  }, [userProfile, fetchReports]);

  // Listen for sync events
  useEffect(() => {
    const handleSyncEvent = (event) => {
      console.log('Sync event received:', event);
      if (event.type === 'sync_success') {
        // Refresh reports and sync status when sync completes
        fetchReports();
        updateSyncStatus();
      }
    };

    syncService.addSyncListener(handleSyncEvent);
    
    return () => {
      syncService.removeSyncListener(handleSyncEvent);
    };
  }, [fetchReports, updateSyncStatus]);

  // Real-time subscription to reports (only when online and not manually fetching)
  useEffect(() => {
    if (!userProfile?.id || !userProfile?.role || !isOnline) return;

    console.log('Setting up real-time subscription for reports...');
    const unsubscribe = subscribeToSharedReports(
      userProfile.id, 
      userProfile.role, 
      (reports) => {
        console.log('Real-time reports update:', reports);
        
        // Only update if we're not currently loading (to avoid duplicates)
        if (!loading) {
          setReports(reports);
        }
        
        // Cache the reports for offline use
        if (reports && reports.length > 0) {
          const cacheReports = async () => {
            try {
              const offlineStorage = (await import('../utils/enhancedOfflineStorage')).default;
              await offlineStorage.initialize();
              await offlineStorage.storeReports(reports);
              console.log('Reports cached from real-time update');
            } catch (error) {
              console.warn('Failed to cache reports from real-time update:', error);
            }
          };
          cacheReports();
        }
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userProfile?.id, userProfile?.role, isOnline, loading]);

  useEffect(() => {
    // Update sync status periodically
    const interval = setInterval(updateSyncStatus, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const searchPatient = async () => {
    if (!patientSearchTerm.trim()) {
      toast.error('Please enter a patient ID');
      return;
    }

    try {
      const patient = await getUser(patientSearchTerm.trim());
      if (!patient) {
        toast.error('Patient not found');
        return;
      }
      if (patient.role !== 'patient') {
        toast.error('Entered ID does not belong to a patient');
        return;
      }
      setSearchedPatient(patient);
      await fetchReports(patient.id, true);
      setShowPatientSearch(false);
      toast.success(`Viewing reports for ${patient.name || patient.id}`);
    } catch (error) {
      console.error('Error searching patient:', error);
      toast.error('Failed to search patient');
    }
  };

  const clearPatientSearch = () => {
    setSearchedPatient(null);
    setPatientSearchTerm('');
    fetchReports();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a valid file (JPEG, PNG, GIF, or PDF)');
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setNewReport(prev => ({ ...prev, file }));
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    
    if (!newReport.title.trim() || !newReport.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setUploading(true);
      console.log('Starting report upload...');

      // If doctor or admin, validate patient ID
      if (['doctor','admin'].includes(userProfile?.role)) {
        if (!newReport.patientId || !newReport.patientId.trim()) {
          toast.error('Patient ID is required');
          setUploading(false);
          return;
        }
        const patientProfile = await getUser(newReport.patientId.trim());
        if (!patientProfile || patientProfile.role !== 'patient') {
          toast.error('Invalid Patient ID');
          setUploading(false);
          return;
        }
      }
      
      // Convert file to base64 for storage
      let fileData = null;
      if (newReport.file) {
        console.log('Converting file to base64...');
        fileData = await convertFileToBase64(newReport.file);
        console.log('File converted successfully');
      }

      const reportData = {
        patientId: userProfile?.role === 'patient' ? userProfile.id : newReport.patientId,
        doctorId: userProfile.id,
        title: newReport.title,
        reportType: newReport.reportType,
        description: newReport.description,
        date: new Date(newReport.date),
        fileName: newReport.file?.name || null,
        fileType: newReport.file?.type || null,
        fileData: fileData,
        fileSize: newReport.file?.size || null,
        status: 'active'
      };

      console.log('Creating report with data:', reportData);
      const reportId = await syncService.createReportWithOfflineSupport(reportData);
      console.log('Report created with ID:', reportId);
      
      toast.success(isOnline ? 'Report uploaded successfully!' : 'Report saved offline, will sync when online');
      
      // Reset form
      setNewReport({
        title: '',
        reportType: 'lab',
        description: '',
        file: null,
        date: new Date().toISOString().split('T')[0],
        patientId: ''
      });
      setShowUploadModal(false);
      
      // Refresh reports
      console.log('Refreshing reports...');
      await fetchReports(searchedPatient?.id || null, Boolean(searchedPatient));
      await updateSyncStatus();
      console.log('Reports refreshed successfully');
      
    } catch (error) {
      console.error('Error uploading report:', error);
      toast.error('Failed to upload report');
    } finally {
      setUploading(false);
      console.log('Upload process completed');
    }
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await syncService.deleteReportWithOfflineSupport(reportId);
      toast.success(isOnline ? 'Report deleted successfully!' : 'Report deleted offline, will sync when online');
      
      // Refresh reports
      await fetchReports();
      await updateSyncStatus();
      
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    }
  };

  const handleDownloadReport = (report) => {
    if (report.fileData) {
      const link = document.createElement('a');
      link.href = report.fileData;
      link.download = report.fileName || `${report.title}.${report.fileType?.split('/')[1] || 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast.error('File not available for download');
    }
  };


  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || report.reportType === filterType;
    return matchesSearch && matchesFilter;
  });

  const getReportTypeColor = (type) => {
    switch (type) {
      case 'lab': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'radiology': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'prescription': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'consultation': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-dots">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Medical Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {(['doctor','admin'].includes(userProfile?.role)) 
              ? 'View and manage patient medical reports' 
              : 'View and manage your medical reports with offline access'
            }
          </p>
          {searchedPatient && (
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-sm text-blue-600 dark:text-blue-400">
                Viewing reports for: {searchedPatient.name || searchedPatient.id}
              </span>
              <button
                onClick={clearPatientSearch}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-6">
          {/* Status Indicators */}
          <div className="flex items-center space-x-4">
            {/* Online/Offline Status */}
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Sync Status */}
            {syncStatus.pendingSync > 0 && (
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  {syncStatus.pendingSync} pending
                </span>
              </div>
            )}
            
            {/* Offline Reports Count */}
            {reports.filter(r => r.isOffline).length > 0 && (
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <WifiOff className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {reports.filter(r => r.isOffline).length} offline
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Sync Button */}
            <button
              onClick={handleManualSync}
              disabled={!isOnline || syncStatus.syncInProgress}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus.syncInProgress ? 'animate-spin' : ''}`} />
              <span>{syncStatus.syncInProgress ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            {/* Patient Search Button (for doctors/admins) */}
            {(['doctor','admin'].includes(userProfile?.role)) && !searchedPatient && (
              <button
                onClick={() => setShowPatientSearch(true)}
                className="btn-secondary flex items-center space-x-2"
              >
                <Search className="w-4 h-4" />
                <span>Search Patient</span>
              </button>
            )}
          </div>

          {/* Upload Report Button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Report</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center">
            <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl">
              <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Total Reports
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {reports.length}
              </p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center">
            <div className="p-4 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-xl">
              <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Cached Reports
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {syncStatus.cachedReports || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center">
            <div className="p-4 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl">
              <Clock className="w-7 h-7 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Pending Sync
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {syncStatus.pendingSync || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center">
            <div className="p-4 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl">
              <Calendar className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                This Month
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {reports.filter(r => {
                  const reportDate = new Date(r.createdAt?.toDate?.() || r.createdAt);
                  const now = new Date();
                  return reportDate.getMonth() === now.getMonth() && 
                         reportDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-12 pr-4 py-3 text-base"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input-field pl-12 pr-8 py-3 text-base"
            >
              <option value="all">All Report Types</option>
              <option value="lab">Lab Reports</option>
              <option value="radiology">Radiology</option>
              <option value="prescription">Prescriptions</option>
              <option value="consultation">Consultations</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No reports found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm || filterType !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Upload your first medical report to get started'
              }
            </p>
            {!searchTerm && filterType === 'all' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-primary"
              >
                Upload Report
              </button>
            )}
          </div>
        ) : (
          filteredReports.map((report) => (
            <div key={report.id} className="card hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {report.title}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getReportTypeColor(report.reportType)}`}>
                      {report.reportType}
                    </span>
                    {report.isOffline && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 flex items-center space-x-1">
                        <WifiOff className="w-4 h-4" />
                        <span>Offline</span>
                      </span>
                    )}
                    {report.tempId && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>Pending Sync</span>
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    {report.description}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(report.createdAt?.toDate?.() || report.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {report.fileName && (
                      <div className="flex items-center space-x-1">
                        <FileText className="w-4 h-4" />
                        <span>{report.fileName}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {report.fileData && (
                    <button
                      onClick={() => handleDownloadReport(report)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteReport(report.id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Patient Search Modal */}
      {showPatientSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Search Patient
              </h2>
              <button
                onClick={() => setShowPatientSearch(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Patient ID
                </label>
                <input
                  type="text"
                  value={patientSearchTerm}
                  onChange={(e) => setPatientSearchTerm(e.target.value)}
                  className="input-field"
                  placeholder="Enter patient ID"
                  onKeyPress={(e) => e.key === 'Enter' && searchPatient()}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPatientSearch(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={searchPatient}
                  className="btn-primary flex-1"
                >
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Upload Medical Report
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              {(['doctor','admin'].includes(userProfile?.role)) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Patient ID *
                  </label>
                  <input
                    type="text"
                    value={newReport.patientId}
                    onChange={(e) => setNewReport(prev => ({ ...prev, patientId: e.target.value }))}
                    className="input-field"
                    placeholder="Enter patient ID"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Report Title *
                </label>
                <input
                  type="text"
                  value={newReport.title}
                  onChange={(e) => setNewReport(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field"
                  placeholder="e.g., Blood Test Results"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Report Type *
                </label>
                <select
                  value={newReport.reportType}
                  onChange={(e) => setNewReport(prev => ({ ...prev, reportType: e.target.value }))}
                  className="input-field"
                  required
                >
                  <option value="lab">Lab Report</option>
                  <option value="radiology">Radiology Report</option>
                  <option value="prescription">Prescription</option>
                  <option value="consultation">Consultation Notes</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={newReport.date}
                  onChange={(e) => setNewReport(prev => ({ ...prev, date: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={newReport.description}
                  onChange={(e) => setNewReport(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field"
                  rows={3}
                  placeholder="Brief description of the report..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload File (Optional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  accept="image/*,.pdf"
                  className="input-field"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Supported formats: JPEG, PNG, GIF, PDF (Max 5MB)
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="btn-primary flex-1 flex items-center justify-center space-x-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
