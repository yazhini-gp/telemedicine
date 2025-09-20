import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  MapPin, 
  Phone, 
  Clock, 
  Pill,
  Navigation,
  Filter,
  Star
} from 'lucide-react';
import { getMedicalCenters, getAllPharmacies, searchMedicines, getPharmacyStock } from '../services/api';

const MedicalCenters = () => {
  const { t } = useTranslation();
  const [centers, setCenters] = useState([]);
  const [filteredCenters, setFilteredCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDistance, setFilterDistance] = useState('all');
	const [pharmaciesById, setPharmaciesById] = useState({});
	const [expandedCenterId, setExpandedCenterId] = useState(null);
	const [centerStockById, setCenterStockById] = useState({});
	const [medicineResults, setMedicineResults] = useState([]);
	const [searchingMedicines, setSearchingMedicines] = useState(false);
	const [loadingStockId, setLoadingStockId] = useState(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [centersData, pharmacies] = await Promise.all([
					getMedicalCenters().catch(() => []),
					getAllPharmacies().catch(() => [])
				]);

				// Index pharmacies by id for quick lookup
				const byId = (pharmacies || []).reduce((acc, p) => {
					acc[p.id] = p;
					return acc;
				}, {});
				setPharmaciesById(byId);

				let enriched = centersData && centersData.length ? centersData : [];

				// Normalize center fields to expected UI schema
				enriched = enriched.map((c) => ({
					...c,
					name: c.name || c.title || c.hospitalName || c.displayName || c.id,
					location: c.location || c.address || c.area || '',
					contact: c.contact || c.phone || c.mobile || '',
					hours: c.hours || c.timings || c.openHours || '',
					services: c.services || c.serviceList || [],
					distance: c.distance || 0,
					rating: c.rating || 4.5,
				}));

				// If no centers found after normalization, fallback to representing pharmacies as centers
				if (enriched.length === 0 && pharmacies && pharmacies.length) {
					enriched = pharmacies.map(p => ({
						id: p.id,
						name: p.name || p.id,
						location: p.address || p.location || '',
						contact: p.phone || p.contact || '',
						hours: p.hours || '24/7',
						services: p.services || ['Pharmacy'],
						// derive available medicines tags from stock keys
						availableMedicines: p.stock ? Object.keys(p.stock) : [],
						distance: p.distance || 0,
						rating: p.rating || 4.5,
					}));
				} else {
					// Enrich medical centers with availableMedicines from matching pharmacy stock when possible
					enriched = enriched.map(c => {
						const pharmacy = byId[c.id] || byId[c.pharmacyId || ''] || null;
						const availableMedicines = c.availableMedicines && c.availableMedicines.length
							? c.availableMedicines
							: (pharmacy && pharmacy.stock ? Object.keys(pharmacy.stock) : []);
						return { ...c, availableMedicines };
					});
				}

				setCenters(enriched);
				setFilteredCenters(enriched);
			} catch (error) {
				console.error('Error fetching medical centers/pharmacies:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	// Lazy-load stock from DB when a center is expanded and local pharmacy stock is empty
	useEffect(() => {
		const loadStock = async () => {
			if (!expandedCenterId) return;
			const existing = centerStockById[expandedCenterId];
			const expandedCenter = centers.find(c => c.id === expandedCenterId);
			const fid = expandedCenter?.pharmacyId || expandedCenterId || 'pharmacy-1';
			const pharmacy = pharmaciesById[fid];
			const hasLocalStock = pharmacy && pharmacy.stock && Object.keys(pharmacy.stock).length > 0;
			if (existing || hasLocalStock) return;
			setLoadingStockId(expandedCenterId);
			try {
				const res = await getPharmacyStock(fid);
				if (res && res.stock) {
					setCenterStockById(prev => ({ ...prev, [fid]: res.stock }));
				}
			} catch (e) {
				// ignore
			} finally {
				setLoadingStockId(null);
			}
		};
		loadStock();
	}, [expandedCenterId, pharmaciesById, centers, centerStockById]);

	useEffect(() => {
		let filtered = centers;

		if (searchTerm) {
			const term = searchTerm.toLowerCase();
			filtered = filtered.filter(center => {
				const matchesBasic = center.name?.toLowerCase().includes(term) ||
					(center.location || '').toLowerCase().includes(term) ||
					(center.contact || '').toLowerCase().includes(term);
				// also search in pharmacy stock keys
				const pharmacy = pharmaciesById[center.id] || pharmaciesById[center.pharmacyId || ''];
				const stockKeys = pharmacy && pharmacy.stock ? Object.keys(pharmacy.stock) : center.availableMedicines || [];
				const matchesMedicine = stockKeys.some(m => (m || '').toLowerCase().includes(term));
				return matchesBasic || matchesMedicine;
			});

			// Trigger medicine search fallback (global medicines) when typing
			if (searchTerm.trim().length >= 2) {
				setSearchingMedicines(true);
				searchMedicines(searchTerm)
					.then(res => setMedicineResults(res || []))
					.catch(() => setMedicineResults([]))
					.finally(() => setSearchingMedicines(false));
			} else {
				setMedicineResults([]);
			}
		}

		if (filterDistance !== 'all') {
			// Mock distance filtering - in real app, you'd calculate actual distances
			const maxDistance = parseInt(filterDistance);
			filtered = filtered.filter(center => 
				center.distance <= maxDistance
			);
		}

		setFilteredCenters(filtered);
	}, [centers, searchTerm, filterDistance, pharmaciesById]);

	// No hardcoded fallback: show empty state if DB has no data

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
            {t('medicalCenters.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Find nearby medical centers and check medicine availability
          </p>
        </div>
        <button className="btn-primary flex items-center space-x-2">
          <Navigation className="w-5 h-5" />
          <span>{t('medicalCenters.findNearest')}</span>
        </button>
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
              placeholder="Search medical centers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterDistance}
              onChange={(e) => setFilterDistance(e.target.value)}
              className="input-field"
            >
              <option value="all">All Distances</option>
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="20">Within 20 km</option>
            </select>
          </div>
        </div>
      </div>

      {/* Centers List */}
      <div className="space-y-4">
        {filteredCenters.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No medical centers found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Try adjusting your search criteria' : 'No medical centers available in your area'}
            </p>
            {searchTerm && (
              <div className="mt-6 text-left">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Medicine results</h4>
                {searchingMedicines ? (
                  <div className="text-gray-600 dark:text-gray-400 text-sm">Searching medicines...</div>
                ) : medicineResults.length === 0 ? (
                  <div className="text-gray-600 dark:text-gray-400 text-sm">No medicines found</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {medicineResults.map((m) => (
                      <div key={m.id} className="p-3 rounded border bg-white dark:bg-gray-800">
                        <div className="font-medium text-gray-900 dark:text-white">{m.name || m.id}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {m.category && <span>Category: {m.category}</span>}
                          {m.stock !== undefined && <span className="ml-2">Stock: {m.stock}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          filteredCenters.map((center) => (
            <div key={center.id} className="glass-card p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <MapPin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {center.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{center.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Navigation className="w-4 h-4" />
                          <span>{center.distance} km away</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4" />
                          <span>{center.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Contact Information
                      </h4>
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4" />
                          <span>{center.contact}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>{center.hours}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Available Services
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {center.services?.map((service, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs font-medium"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      {t('medicalCenters.availableMedicines')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {center.availableMedicines?.map((medicine, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-sm font-medium flex items-center space-x-1"
                        >
                          <Pill className="w-3 h-3" />
                          <span>{medicine}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">
                        Open Now
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setExpandedCenterId(expandedCenterId === center.id ? null : center.id)}
                        className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
                      >
                        {expandedCenterId === center.id ? 'Hide Medicines' : 'View Medicines'}
                      </button>
                      <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center space-x-1">
                        <Navigation className="w-4 h-4" />
                        <span>Directions</span>
                      </button>
                      <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm flex items-center space-x-1">
                        <Phone className="w-4 h-4" />
                        <span>Call</span>
                      </button>
                    </div>
                  </div>

                  {expandedCenterId === center.id && (
                    <div className="mt-6 border-t pt-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        Medicines and Stock
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(() => {
						const fidRow = center.pharmacyId || center.id || 'pharmacy-1';
						const pharmacy = pharmaciesById[fidRow];
						const stock = (pharmacy && pharmacy.stock ? pharmacy.stock : null) || centerStockById[fidRow] || {};
                          const entries = Object.entries(stock);
                          if (entries.length === 0) {
							return (
								<div className="text-sm text-gray-600 dark:text-gray-400">
									{loadingStockId === center.id ? 'Loading stock...' : 'No stock data available.'}
								</div>
							);
                          }
                          return entries.map(([medicineName, info]) => (
                            <div key={medicineName} className="p-3 rounded border bg-white dark:bg-gray-800">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {info?.name || medicineName}
                                </div>
                                {typeof info?.quantity === 'number' && (
                                  <span className={`px-2 py-0.5 rounded text-xs ${info.quantity <= 5 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : info.quantity <= 20 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
                                    {info.quantity} in stock
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {info?.category && <span>Category: {info.category}</span>}
                                {info?.price !== undefined && <span className="ml-2">Price: {info.price}</span>}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Map Integration Placeholder */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Interactive Map
        </h3>
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-64 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400">
              Map integration would be implemented here with Google Maps API
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Shows real-time locations and directions to medical centers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalCenters;
