import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { 
  Search, 
  Plus, 
  MessageCircle, 
  Video, 
  Phone, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Star,
  MapPin,
  Award,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { 
  getPatientConsultations, 
  getDoctorConsultations, 
  createConsultation,
  updateConsultationStatus,
  getUsersByRole 
} from '../services/api';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, where, orderBy, doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const Consultations = () => {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState([]);
  const [filteredConsultations, setFilteredConsultations] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
  const [doctorFilterSpecialty, setDoctorFilterSpecialty] = useState('all');
  const [doctorFilterAvailability, setDoctorFilterAvailability] = useState('all');
  const [requestData, setRequestData] = useState({
    doctorId: '',
    mode: 'video',
    reason: '',
    urgency: 'medium'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!userProfile?.id) return;

        let consultationsData;
        if (userProfile.role === 'doctor') {
          consultationsData = await getDoctorConsultations(userProfile.id);
        } else {
          consultationsData = await getPatientConsultations(userProfile.id);
          const doctorsData = await getUsersByRole('doctor');
          // Add mock availability and specializations for demo
          const enhancedDoctors = doctorsData.map(doctor => ({
            ...doctor,
            availability: Math.random() > 0.3 ? 'available' : 'busy', // Mock availability
            rating: (4 + Math.random()).toFixed(1), // Mock rating
            experience: Math.floor(Math.random() * 20) + 1, // Mock experience
            consultationFee: Math.floor(Math.random() * 50) + 20, // Mock fee
            specializations: doctor.domain ? [doctor.domain] : ['General Medicine'], // Use domain as specialization
            nextAvailable: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000) // Mock next available time
          }));
          setDoctors(enhancedDoctors);
          setFilteredDoctors(enhancedDoctors);
        }

        setConsultations(consultationsData);
        setFilteredConsultations(consultationsData);
      } catch (error) {
        console.error('Error fetching consultations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile]);

  // Real-time list sync: keep consultations list up-to-date for both roles
  useEffect(() => {
    if (!userProfile?.id) return;

    const col = collection(db, 'consultations');
    const q = userProfile.role === 'doctor'
      ? query(col, where('doctorId', '==', userProfile.id), orderBy('createdAt', 'desc'))
      : query(col, where('patientId', '==', userProfile.id), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setConsultations(items);
      setFilteredConsultations((prev) => {
        // Re-apply current filters and search on the fresh list
        let filtered = items;
        if (searchTerm) {
          filtered = filtered.filter(consultation =>
            consultation.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            consultation.mode?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        if (filterStatus !== 'all') {
          filtered = filtered.filter(consultation => consultation.status === filterStatus);
        }
        return filtered;
      });
    });

    return () => unsubscribe();
  }, [userProfile, searchTerm, filterStatus]);

  // Real-time: for patients, auto-redirect to call when doctor accepts (Jitsi rooms don't require signaling)
  useEffect(() => {
    if (!userProfile?.id || userProfile?.role !== 'patient') return;

    const col = collection(db, 'consultations');
    const q = query(
      col,
      where('patientId', '==', userProfile.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        const data = change.doc.data();
        const id = change.doc.id;

        if (data?.mode === 'video' && data?.status === 'accepted') {
          // Prevent immediate re-redirect after leaving
          if (sessionStorage.getItem(`suppressCallRedirect:${id}`)) return;
          // Don't redirect if consultation is completed
          if (data?.status === 'completed') return;
          navigate(`/call/${id}`);
        }
      });
    });

    return () => unsubscribe();
  }, [userProfile, navigate]);

  useEffect(() => {
    let filtered = consultations;

    if (searchTerm) {
      filtered = filtered.filter(consultation =>
        consultation.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        consultation.mode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(consultation => consultation.status === filterStatus);
    }

    setFilteredConsultations(filtered);
  }, [consultations, searchTerm, filterStatus]);

  // Doctor filtering effect
  useEffect(() => {
    let filtered = doctors;

    if (doctorSearchTerm) {
      filtered = filtered.filter(doctor =>
        doctor.name?.toLowerCase().includes(doctorSearchTerm.toLowerCase()) ||
        doctor.specializations?.some(spec => spec.toLowerCase().includes(doctorSearchTerm.toLowerCase()))
      );
    }

    if (doctorFilterSpecialty !== 'all') {
      filtered = filtered.filter(doctor =>
        doctor.specializations?.includes(doctorFilterSpecialty)
      );
    }

    if (doctorFilterAvailability !== 'all') {
      filtered = filtered.filter(doctor => doctor.availability === doctorFilterAvailability);
    }

    setFilteredDoctors(filtered);
  }, [doctors, doctorSearchTerm, doctorFilterSpecialty, doctorFilterAvailability]);

  const handleRequestConsultation = async (e) => {
    e.preventDefault();
    
    if (!requestData.doctorId) {
      toast.error('Please select a doctor first');
      return;
    }
    
    try {
      await createConsultation({
        patientId: userProfile.id,
        doctorId: requestData.doctorId,
        mode: requestData.mode,
        reason: requestData.reason,
        urgency: requestData.urgency
      });
      
      toast.success('Consultation request sent successfully!');
      setShowRequestModal(false);
      setRequestData({
        doctorId: '',
        mode: 'video',
        reason: '',
        urgency: 'medium'
      });
      
      // Refresh consultations
      const consultationsData = await getPatientConsultations(userProfile.id);
      setConsultations(consultationsData);
      setFilteredConsultations(consultationsData);
    } catch (error) {
      console.error('Error creating consultation:', error);
      toast.error('Failed to send consultation request');
    }
  };

  const handleStatusUpdate = async (consultationId, status) => {
    try {
      await updateConsultationStatus(consultationId, status);
      toast.success(`Consultation ${status} successfully!`);
      
      // Refresh consultations
      const consultationsData = userProfile.role === 'doctor' 
        ? await getDoctorConsultations(userProfile.id)
        : await getPatientConsultations(userProfile.id);
      setConsultations(consultationsData);
      setFilteredConsultations(consultationsData);
    } catch (error) {
      console.error('Error updating consultation status:', error);
      toast.error('Failed to update consultation status');
    }
  };

  const handleVideoConsultation = (doctorId) => {
    // For demo purposes, we'll show a toast. In a real app, this would start a video call
    toast.success('Starting video consultation...');
    // Here you would integrate with a video calling service like WebRTC, Agora, etc.
    console.log('Starting video consultation with doctor:', doctorId);
  };

  const handleSelectDoctor = (doctor) => {
    setRequestData({
      ...requestData,
      doctorId: doctor.id
    });
    setShowRequestModal(true);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.toDate()).toLocaleDateString();
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.toDate()).toLocaleTimeString();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'audio':
        return <Phone className="w-5 h-5" />;
      case 'text':
        return <MessageCircle className="w-5 h-5" />;
      default:
        return <MessageCircle className="w-5 h-5" />;
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
            {t('consultation.request')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {userProfile?.role === 'doctor' ? 'Manage consultation requests' : 'Request and manage consultations'}
          </p>
        </div>
        {userProfile?.role === 'patient' && (
          <div className="flex space-x-3">
            <button 
              onClick={() => document.getElementById('doctor-list')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-secondary flex items-center space-x-2"
            >
              <User className="w-5 h-5" />
              <span>Browse Doctors</span>
            </button>
            <button 
              onClick={() => setShowRequestModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Request Consultation</span>
            </button>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search consultations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Consultations List */}
      <div className="space-y-4">
        {filteredConsultations.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No consultations found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Try adjusting your search criteria' : 'No consultations available yet'}
            </p>
          </div>
        ) : (
          filteredConsultations.map((consultation) => (
            <div key={consultation.id} className="glass-card p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      {getModeIcon(consultation.mode)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {consultation.mode?.charAt(0).toUpperCase() + consultation.mode?.slice(1)} Consultation
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(consultation.createdAt)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(consultation.createdAt)}</span>
                        </div>
                        {userProfile?.role === 'patient' && consultation.doctorName && (
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>Dr. {consultation.doctorName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {consultation.reason && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Reason for Consultation
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {consultation.reason}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(consultation.status)}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          consultation.status === 'pending' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                          consultation.status === 'accepted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          consultation.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          consultation.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {consultation.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Urgency:
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          consultation.urgency === 'emergency' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          consultation.urgency === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                          consultation.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {consultation.urgency}
                        </span>
                      </div>
                    </div>

                    {userProfile?.role === 'doctor' && consultation.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button 
                          onClick={async () => {
                            // Generate unique room key to avoid locked rooms
                            const roomKey = Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
                            try {
                              const ref = doc(db, 'consultations', consultation.id);
                              await setDoc(ref, { status: 'accepted', roomKey }, { merge: true });
                            } catch (e) {
                              // fallback to status update helper
                              await handleStatusUpdate(consultation.id, 'accepted');
                            }
                            navigate(`/call/${consultation.id}`);
                          }}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(consultation.id, 'rejected')}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {userProfile?.role === 'patient' && consultation.status === 'accepted' && consultation.mode === 'video' && (
                      <div>
                        <button
                          onClick={() => navigate(`/call/${consultation.id}`)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          Join Video Call
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Available Doctors (inline) */}
      {userProfile?.role === 'patient' && (
        <div id="doctor-list" className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Available Doctors</h2>

          <div className="glass-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search doctors or specializations..."
                  value={doctorSearchTerm}
                  onChange={(e) => setDoctorSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              <select
                value={doctorFilterSpecialty}
                onChange={(e) => setDoctorFilterSpecialty(e.target.value)}
                className="input-field"
              >
                <option value="all">All Specializations</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Dermatology">Dermatology</option>
                <option value="General Medicine">General Medicine</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Neurology">Neurology</option>
                <option value="Orthopedics">Orthopedics</option>
              </select>
              <select
                value={doctorFilterAvailability}
                onChange={(e) => setDoctorFilterAvailability(e.target.value)}
                className="input-field"
              >
                <option value="all">All Availability</option>
                <option value="available">Available Now</option>
                <option value="busy">Busy</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <div key={doctor.id} className="card hover:shadow-xl transition-all duration-300">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Dr. {doctor.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{doctor.specializations?.[0] || 'General Medicine'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{doctor.rating}</span>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    {doctor.specializations?.map((spec, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs rounded-full">{spec}</span>
                    ))}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Award className="w-4 h-4" />
                      <span>{doctor.experience} years experience</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span>${doctor.consultationFee}/consultation</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>Next available: {doctor.nextAvailable?.toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {doctor.availability === 'available' ? (
                        <Wifi className="w-4 h-4 text-green-500" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${doctor.availability === 'available' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {doctor.availability === 'available' ? 'Available Now' : 'Busy'}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button onClick={() => handleSelectDoctor(doctor)} className="flex-1 btn-secondary text-sm">Request Consultation</button>
                    {doctor.availability === 'available' && (
                      <button onClick={() => handleVideoConsultation(doctor.id)} className="flex-1 btn-primary text-sm flex items-center justify-center space-x-1">
                        <Video className="w-4 h-4" />
                        <span>Video Call</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredDoctors.length === 0 && (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No doctors found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      )}

      {/* Request Consultation Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Request Consultation
            </h2>
            <form onSubmit={handleRequestConsultation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selected Doctor
                </label>
                {requestData.doctorId ? (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    {(() => {
                      const selectedDoctor = doctors.find(d => d.id === requestData.doctorId);
                      return selectedDoctor ? (
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              Dr. {selectedDoctor.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedDoctor.specializations?.[0] || 'General Medicine'}
                            </p>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => document.getElementById('doctor-list')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                  >
                    Click to browse and select a doctor
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Consultation Mode
                </label>
                <select
                  value={requestData.mode}
                  onChange={(e) => setRequestData({...requestData, mode: e.target.value})}
                  className="input-field"
                >
                  <option value="video">Video Call</option>
                  <option value="audio">Audio Call</option>
                  <option value="text">Text Chat</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for Consultation
                </label>
                <textarea
                  value={requestData.reason}
                  onChange={(e) => setRequestData({...requestData, reason: e.target.value})}
                  className="input-field"
                  rows="3"
                  placeholder="Describe your symptoms or concerns..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Urgency Level
                </label>
                <select
                  value={requestData.urgency}
                  onChange={(e) => setRequestData({...requestData, urgency: e.target.value})}
                  className="input-field"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Consultations;
