import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  FileText, 
  MessageCircle, 
  Pill, 
  MapPin, 
  Activity,
  Calendar,
  TrendingUp,
  Users,
  Clock,
  AlertCircle
} from 'lucide-react';
import { 
  getPatientConsultations, 
  getPatientPrescriptions,
  subscribeToPatientReports
} from '../services/api';

const PatientDashboard = () => {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    consultations: 0,
    prescriptions: 0,
    pendingConsultations: 0,
    reports: 0
  });
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!userProfile?.id) return;

        const [consultations, prescriptions] = await Promise.all([
          getPatientConsultations(userProfile.id),
          getPatientPrescriptions(userProfile.id)
        ]);

        const pendingConsultations = consultations.filter(c => c.status === 'pending').length;

        setStats({
          consultations: consultations.length,
          prescriptions: prescriptions.length,
          pendingConsultations
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userProfile]);

  // Real-time subscription to patient reports
  useEffect(() => {
    if (!userProfile?.id) return;

    const unsubscribe = subscribeToPatientReports(userProfile.id, (reports) => {
      setRecentReports(reports.slice(0, 3)); // Show only 3 most recent reports
      setStats(prev => ({
        ...prev,
        reports: reports.length
      }));
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userProfile?.id]);

  const quickActions = [
    {
      title: 'Medical Reports',
      icon: FileText,
      color: 'bg-indigo-500',
      href: '/reports',
      description: 'Upload and view medical reports'
    },
    {
      title: t('dashboard.patient.consultations'),
      icon: MessageCircle,
      color: 'bg-green-500',
      href: '/consultations',
      description: 'Request or view consultations'
    },
    {
      title: t('dashboard.patient.prescriptions'),
      icon: Pill,
      color: 'bg-purple-500',
      href: '/prescriptions',
      description: 'View your prescriptions'
    },
    {
      title: t('dashboard.patient.medicalCenters'),
      icon: MapPin,
      color: 'bg-orange-500',
      href: '/medical-centers',
      description: 'Find nearby medical centers'
    },
    {
      title: t('dashboard.patient.symptomChecker'),
      icon: Activity,
      color: 'bg-red-500',
      href: '/chatbot',
      description: 'AI-powered symptom analysis'
    }
  ];

  const recentActivities = [
    {
      type: 'consultation',
      title: 'Video consultation with Dr. Smith',
      time: '2 hours ago',
      status: 'completed',
      icon: MessageCircle
    },
    {
      type: 'prescription',
      title: 'New prescription received',
      time: '1 day ago',
      status: 'active',
      icon: Pill
    },
    {
      type: 'record',
      title: 'Medical record updated',
      time: '3 days ago',
      status: 'updated',
      icon: FileText
    }
  ];

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
      {/* Welcome Section */}
      <div className="glass-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('dashboard.welcome')}, {userProfile?.name}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('dashboard.patient.title')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString()}
            </div>
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Medical Reports
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.reports}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('dashboard.patient.consultations')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.consultations}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Pill className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('dashboard.patient.prescriptions')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.prescriptions}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending Consultations
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.pendingConsultations}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => navigate(action.href)}
              className="card hover:shadow-xl transition-all duration-300 group w-full text-left"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 ${action.color} rounded-lg group-hover:scale-110 transition-transform duration-200`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {action.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Reports */}
      {recentReports.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Recent Reports
          </h2>
          <div className="card">
            <div className="space-y-4">
              {recentReports.map((report) => (
                <div key={report.id} className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {report.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {report.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {new Date(report.createdAt?.toDate?.() || report.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    {report.reportType}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activities */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Recent Activities
        </h2>
        <div className="card">
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <activity.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {activity.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {activity.time}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  activity.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  activity.status === 'active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {activity.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Health Tips */}
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Health Tip of the Day
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Stay hydrated by drinking at least 8 glasses of water daily. Proper hydration helps maintain energy levels and supports overall health.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
