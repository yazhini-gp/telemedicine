import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { 
  Search, 
  Plus, 
  Pill, 
  Calendar, 
  User, 
  Download,
  Eye,
  FileText
} from 'lucide-react';
import { getPatientPrescriptions, getDoctorPrescriptions, createPrescription, subscribeToPatientPrescriptions, subscribeToDoctorPrescriptions, getUser } from '../services/api';
import toast from 'react-hot-toast';

const Prescriptions = () => {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState({
    patientId: '',
    medicines: [{ name: '', dosage: '', duration: '', instructions: '' }],
    bill: 0
  });

  useEffect(() => {
    if (!userProfile?.id) return;

    // Patients: live subscription to their prescriptions
    if (userProfile?.role === 'patient') {
      const unsub = subscribeToPatientPrescriptions(userProfile.id, (rx) => {
        setPrescriptions(rx);
        setFilteredPrescriptions(rx);
        setLoading(false);
      });
      return () => unsub && unsub();
    }

    // Doctors: subscribe to prescriptions authored by the doctor
    if (userProfile?.role === 'doctor') {
      const unsub = subscribeToDoctorPrescriptions(userProfile.id, (rx) => {
        setPrescriptions(rx);
        setFilteredPrescriptions(rx);
        setLoading(false);
      });
      return () => unsub && unsub();
    }

    // Fallback: fetch by user id (rare case)
    const fetchPrescriptions = async () => {
      try {
        const prescriptionsData = await getPatientPrescriptions(userProfile.id);
        setPrescriptions(prescriptionsData);
        setFilteredPrescriptions(prescriptionsData);
      } catch (error) {
        console.error('Error fetching prescriptions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPrescriptions();
  }, [userProfile]);

  useEffect(() => {
    let filtered = prescriptions;

    if (searchTerm) {
      filtered = filtered.filter(prescription =>
        prescription.medicines?.some(medicine => 
          medicine.name?.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        prescription.doctorName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPrescriptions(filtered);
  }, [prescriptions, searchTerm]);

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    
    try {
      if (!prescriptionData.patientId) {
        toast.error('Patient ID is required');
        return;
      }

      // Validate patient exists and is a patient
      const patientProfile = await getUser(prescriptionData.patientId);
      if (!patientProfile) {
        toast.error('Invalid Patient ID');
        return;
      }
      if (patientProfile.role !== 'patient') {
        toast.error('Entered ID does not belong to a patient');
        return;
      }

      const cleanedMedicines = prescriptionData.medicines.filter(med => med.name.trim());
      if (cleanedMedicines.length === 0) {
        toast.error('Add at least one medicine');
        return;
      }

      await createPrescription({
        doctorId: userProfile.id,
        doctorName: userProfile?.name || '',
        patientId: prescriptionData.patientId,
        patientName: patientProfile?.name || '',
        medicines: cleanedMedicines,
        bill: prescriptionData.bill
      });
      
      toast.success('Prescription created successfully!');
      setShowCreateModal(false);
      setPrescriptionData({
        patientId: '',
        medicines: [{ name: '', dosage: '', duration: '', instructions: '' }],
        bill: 0
      });
      
      // No manual refresh needed; both patient and doctor views use real-time listeners
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast.error('Failed to create prescription');
    }
  };

  const addMedicine = () => {
    setPrescriptionData({
      ...prescriptionData,
      medicines: [...prescriptionData.medicines, { name: '', dosage: '', duration: '', instructions: '' }]
    });
  };

  const removeMedicine = (index) => {
    setPrescriptionData({
      ...prescriptionData,
      medicines: prescriptionData.medicines.filter((_, i) => i !== index)
    });
  };

  const updateMedicine = (index, field, value) => {
    const updatedMedicines = prescriptionData.medicines.map((medicine, i) => 
      i === index ? { ...medicine, [field]: value } : medicine
    );
    setPrescriptionData({ ...prescriptionData, medicines: updatedMedicines });
  };

  const formatId = (id) => {
    if (!id || typeof id !== 'string') return 'N/A';
    if (id.length <= 12) return id;
    return `${id.slice(0, 6)}…${id.slice(-4)}`;
  };

  const renderPrescriptionHTML = (prescription) => {
    const dateStr = formatDate(prescription.createdAt);
    const doctor = prescription.doctorName || formatId(prescription.doctorId) || 'Doctor';
    const patient = formatId(prescription.patientId) || 'Patient';
    const items = (prescription.medicines || []).map((m, idx) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${idx + 1}</td>
        <td style="padding:8px;border:1px solid #ddd;">${m.name || ''}</td>
        <td style="padding:8px;border:1px solid #ddd;">${m.dosage || ''}</td>
        <td style="padding:8px;border:1px solid #ddd;">${m.duration || ''}</td>
        <td style="padding:8px;border:1px solid #ddd;">${m.instructions || ''}</td>
      </tr>
    `).join('');

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Prescription ${prescription.id || ''}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    body { font-family: Arial, sans-serif; color:#111; }
    .container { max-width: 800px; margin: 24px auto; padding: 16px; }
    .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
    .title { font-size:20px; font-weight:700; }
    .meta { color:#555; }
    table { width:100%; border-collapse: collapse; margin-top:12px; }
    th, td { border:1px solid #ddd; padding:8px; text-align:left; }
    th { background:#f7f7f7; }
    .footer { margin-top:20px; font-size:12px; color:#666; }
    @media print {
      .no-print { display:none; }
      body { margin: 0; }
    }
  </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="title">Prescription</div>
        <div class="meta">Date: ${dateStr}</div>
      </div>
      <div class="meta">Doctor: ${doctor}</div>
      <div class="meta">Patient: ${patient}</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Medicine</th>
            <th>Dosage</th>
            <th>Duration</th>
            <th>Instructions</th>
          </tr>
        </thead>
        <tbody>
          ${items}
        </tbody>
      </table>
      ${prescription.bill ? `<div style="margin-top:12px;"><strong>Total Bill:</strong> ₹${prescription.bill}</div>` : ''}
      <div class="footer">Generated by NabhaCare</div>
      <button class="no-print" onclick="window.print()" style="margin-top:16px;padding:8px 12px;">Print</button>
    </div>
  </body>
</html>`;
  };

  const handleDownload = (prescription) => {
    try {
      const html = renderPrescriptionHTML(prescription);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileBase = `prescription_${(prescription.id || 'rx').slice(-8)}`;
      a.download = `${fileBase}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
      toast.error('Failed to download prescription');
    }
  };

  const formatDate = (value) => {
    if (!value) return 'N/A';
    let date;
    try {
      if (typeof value === 'string' || typeof value === 'number') {
        date = new Date(value);
      } else if (value && typeof value.toDate === 'function') {
        date = value.toDate();
      } else if (value && typeof value === 'object' && typeof value.seconds === 'number') {
        date = new Date(value.seconds * 1000);
      } else if (value instanceof Date) {
        date = value;
      } else {
        date = new Date(value);
      }
      if (isNaN(date)) return 'N/A';
      return date.toLocaleDateString();
    } catch {
      return 'N/A';
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
            {t('prescription.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {userProfile?.role === 'doctor' ? 'Create and manage prescriptions' : 'View your prescriptions'}
          </p>
        </div>
        {userProfile?.role === 'doctor' && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Create Prescription</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="glass-card p-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search prescriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="space-y-4">
        {filteredPrescriptions.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Pill className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No prescriptions found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Try adjusting your search criteria' : 'No prescriptions available yet'}
            </p>
          </div>
        ) : (
          filteredPrescriptions.map((prescription) => (
            <div key={prescription.id} className="glass-card p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Pill className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Prescription #{prescription.id.slice(-8)}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(prescription.createdAt)}</span>
                        </div>
                        {userProfile?.role === 'patient' && (
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>Dr. {prescription.doctorName || formatId(prescription.doctorId)}</span>
                          </div>
                        )}
                        {userProfile?.role === 'doctor' && (
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>Patient ID: {formatId(prescription.patientId)}</span>
                          </div>
                        )}
                        {prescription.bill && (
                          <div className="flex items-center space-x-1">
                            <span className="text-lg font-semibold">₹</span>
                            <span>{prescription.bill}</span>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {t('prescription.medicines')}
                    </h4>
                    {prescription.medicines?.map((medicine, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Medicine:
                            </span>
                            <p className="text-gray-900 dark:text-white font-medium">
                              {medicine.name}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {t('prescription.dosage')}:
                            </span>
                            <p className="text-gray-900 dark:text-white">
                              {medicine.dosage}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {t('prescription.duration')}:
                            </span>
                            <p className="text-gray-900 dark:text-white">
                              {medicine.duration}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {t('prescription.instructions')}:
                            </span>
                            <p className="text-gray-900 dark:text-white">
                              {medicine.instructions}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDownload(prescription)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Prescription Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="glass-card p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Create Prescription
            </h2>
            <form onSubmit={handleCreatePrescription} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Patient ID
                </label>
                <input
                  type="text"
                  value={prescriptionData.patientId}
                  onChange={(e) => setPrescriptionData({...prescriptionData, patientId: e.target.value})}
                  className="input-field"
                  placeholder="Enter patient ID"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Medicines
                  </label>
                  <button
                    type="button"
                    onClick={addMedicine}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add Medicine
                  </button>
                </div>
                
                {prescriptionData.medicines.map((medicine, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Medicine {index + 1}
                      </h4>
                      {prescriptionData.medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedicine(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Medicine Name
                        </label>
                        <input
                          type="text"
                          value={medicine.name}
                          onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                          className="input-field text-sm"
                          placeholder="Medicine name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Dosage
                        </label>
                        <input
                          type="text"
                          value={medicine.dosage}
                          onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                          className="input-field text-sm"
                          placeholder="e.g., 500mg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Duration
                        </label>
                        <input
                          type="text"
                          value={medicine.duration}
                          onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                          className="input-field text-sm"
                          placeholder="e.g., 7 days"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Instructions
                        </label>
                        <input
                          type="text"
                          value={medicine.instructions}
                          onChange={(e) => updateMedicine(index, 'instructions', e.target.value)}
                          className="input-field text-sm"
                          placeholder="e.g., Take after meals"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bill Amount (₹)
                </label>
                <input
                  type="number"
                  value={prescriptionData.bill}
                  onChange={(e) => setPrescriptionData({...prescriptionData, bill: parseFloat(e.target.value) || 0})}
                  className="input-field"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Create Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prescriptions;
