import React, { useState, useEffect } from 'react';
import { 
  getAllPharmacies, 
  getPharmacyStock, 
  getAllMedicines, 
  searchMedicines,
  getMedicinesByCategory,
  getLowStockMedicines
} from '../services/api';

const PharmacyTest = () => {
  const [pharmacies, setPharmacies] = useState([]);
  const [pharmacyStock, setPharmacyStock] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load pharmacies on component mount
  useEffect(() => {
    loadPharmacies();
    loadMedicines();
  }, []);

  const loadPharmacies = async () => {
    try {
      setLoading(true);
      const data = await getAllPharmacies();
      setPharmacies(data);
      console.log('Pharmacies loaded:', data);
    } catch (err) {
      console.error('Error loading pharmacies:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const data = await getAllMedicines();
      setMedicines(data);
      console.log('Medicines loaded:', data);
    } catch (err) {
      console.error('Error loading medicines:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPharmacyStock = async (pharmacyId = 'pharmacy-1') => {
    try {
      setLoading(true);
      const data = await getPharmacyStock(pharmacyId);
      setPharmacyStock(data);
      console.log('Pharmacy stock loaded:', data);
    } catch (err) {
      console.error('Error loading pharmacy stock:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setLoading(true);
      const results = await searchMedicines(searchTerm);
      setSearchResults(results);
      console.log('Search results:', results);
    } catch (err) {
      console.error('Error searching medicines:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLowStockMedicines = async () => {
    try {
      setLoading(true);
      const data = await getLowStockMedicines(10);
      setSearchResults(data);
      console.log('Low stock medicines:', data);
    } catch (err) {
      console.error('Error loading low stock medicines:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Pharmacy Database Connection Test</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pharmacies Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Pharmacies</h3>
          <button 
            onClick={loadPharmacies}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
          >
            {loading ? 'Loading...' : 'Load Pharmacies'}
          </button>
          
          <div className="space-y-2">
            {pharmacies.map((pharmacy) => (
              <div key={pharmacy.id} className="bg-white p-3 rounded border">
                <div className="font-medium">{pharmacy.name || pharmacy.id}</div>
                <div className="text-sm text-gray-600">
                  ID: {pharmacy.id}
                </div>
                <button 
                  onClick={() => loadPharmacyStock(pharmacy.id)}
                  className="text-blue-500 text-sm hover:underline mt-1"
                >
                  Load Stock
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Pharmacy Stock Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Pharmacy Stock</h3>
          <button 
            onClick={() => loadPharmacyStock('pharmacy-1')}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 mb-4"
          >
            {loading ? 'Loading...' : 'Load Pharmacy-1 Stock'}
          </button>
          
          {pharmacyStock && (
            <div className="bg-white p-3 rounded border">
              <div className="font-medium">Pharmacy: {pharmacyStock.pharmacy.name || pharmacyStock.pharmacy.id}</div>
              <div className="text-sm text-gray-600 mt-2">
                <pre className="whitespace-pre-wrap text-xs">
                  {JSON.stringify(pharmacyStock, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Medicines Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Medicines Collection</h3>
          <button 
            onClick={loadMedicines}
            disabled={loading}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50 mb-4"
          >
            {loading ? 'Loading...' : 'Load All Medicines'}
          </button>
          
          <div className="text-sm text-gray-600">
            Total medicines: {medicines.length}
          </div>
          
          {medicines.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto">
              {medicines.slice(0, 5).map((medicine) => (
                <div key={medicine.id} className="bg-white p-2 rounded border mb-2 text-xs">
                  <div className="font-medium">{medicine.name || medicine.id}</div>
                  <div className="text-gray-500">
                    {medicine.category && `Category: ${medicine.category}`}
                    {medicine.stock !== undefined && ` | Stock: ${medicine.stock}`}
                  </div>
                </div>
              ))}
              {medicines.length > 5 && (
                <div className="text-gray-500 text-xs">... and {medicines.length - 5} more</div>
              )}
            </div>
          )}
        </div>

        {/* Search Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Search Medicines</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search medicine name..."
              className="flex-1 px-3 py-2 border rounded"
            />
            <button 
              onClick={handleSearch}
              disabled={loading || !searchTerm.trim()}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
            >
              Search
            </button>
          </div>
          
          <button 
            onClick={loadLowStockMedicines}
            disabled={loading}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50 mb-4"
          >
            {loading ? 'Loading...' : 'Load Low Stock Medicines'}
          </button>
          
          <div className="text-sm text-gray-600 mb-2">
            Search results: {searchResults.length}
          </div>
          
          {searchResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto">
              {searchResults.slice(0, 5).map((medicine) => (
                <div key={medicine.id} className="bg-white p-2 rounded border mb-2 text-xs">
                  <div className="font-medium">{medicine.name || medicine.id}</div>
                  <div className="text-gray-500">
                    {medicine.category && `Category: ${medicine.category}`}
                    {medicine.stock !== undefined && ` | Stock: ${medicine.stock}`}
                  </div>
                </div>
              ))}
              {searchResults.length > 5 && (
                <div className="text-gray-500 text-xs">... and {searchResults.length - 5} more</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PharmacyTest;



