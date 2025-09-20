import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  MessageCircle, 
  FileText, 
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { 
  getDoctorConsultations, 
  subscribeToConsultations,
  subscribeToDoctorReports
} from '../services/api';

const DoctorDashboard = () => {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({
    consultations: 0,
    pendingRequests: 0,
    completedToday: 0,
    reportsCreated: 0
  });
  const [pendingConsultations, setPendingConsultations] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!userProfile?.id) return;

        const consultations = await getDoctorConsultations(userProfile.id);

        const pendingRequests = consultations.filter(c => c.status === 'pending').length;
        const today = new Date().toDateString();
        const completedToday = consultations.filter(c => 
          c.status === 'completed' && 
          new Date(c.createdAt?.toDate()).toDateString() === today
        ).length;

        setStats({
          consultations: consultations.length,
          pendingRequests,
          completedToday
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile?.id) return;

    const unsubscribeConsultations = subscribeToConsultations(userProfile.id, (consultations) => {
      setPendingConsultations(consultations);
      setStats(prev => ({
        ...prev,
        pendingRequests: consultations.length
      }));
    });

    const unsubscribeReports = subscribeToDoctorReports(userProfile.id, (reports) => {
      setRecentReports(reports.slice(0, 3)); // Show only 3 most recent reports
      setStats(prev => ({
        ...prev,
        reportsCreated: reports.length
      }));
    });

    return () => {
      unsubscribeConsultations();
      unsubscribeReports();
    };
  }, [userProfile]);

  const quickActions = [
    {
      title: 'Consultations',
      icon: MessageCircle,
      color: 'bg-green-500',
      href: '/consultations',
      description: 'Manage consultation requests'
    },
    {
      title: 'Medical Reports',
      icon: FileText,
      color: 'bg-purple-500',
      href: '/reports',
      description: 'Create and manage medical reports'
    },
    {
      title: 'Availability',
      icon: Calendar,
      color: 'bg-orange-500',
      href: '/settings',
      description: 'Update your availability status'
    }
  ];

  const recentActivities = [
    {
      type: 'consultation',
      title: 'Completed consultation with John Doe',
      time: '1 hour ago',
      status: 'completed',
      icon: CheckCircle
    },
    {
      type: 'prescription',
      title: 'Generated prescription for Jane Smith',
      time: '2 hours ago',
      status: 'active',
      icon: FileText
    },
    {
      type: 'record',
      title: 'Updated medical record',
      time: '3 hours ago',
      status: 'updated',
      icon: Activity
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
              {t('dashboard.welcome')}, Dr. {userProfile?.name}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('dashboard.doctor.title')} • {userProfile?.domain}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Consultations
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.consultations}
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
                Pending Requests
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.pendingRequests}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Reports Created
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.reportsCreated}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Consultation Requests */}
      {pendingConsultations.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {t('dashboard.doctor.pendingRequests')}
          </h2>
          <div className="card">
            <div className="space-y-4">
              {pendingConsultations.map((consultation) => (
                <div key={consultation.id} className="flex items-center justify-between p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Consultation Request
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Mode: {consultation.mode} • Urgency: {consultation.urgency}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {new Date(consultation.createdAt?.toDate()).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm">
                      Accept
                    </button>
                    <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <a
              key={index}
              href={action.href}
              className="card hover:shadow-xl transition-all duration-300 group"
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
            </a>
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

      {/* Professional Tips */}
      <div className="card bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Professional Tip
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Maintain clear communication with patients during consultations. Use simple language and ensure they understand their treatment plan and medication instructions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
