# Pharmacy Database Integration

## Overview
Your application now has access to pharmacy stock data from the same Firebase project (`nabhacare-48e2c`). The pharmacy data is accessible through two main collections:

1. **Pharmacies Collection** (`/pharmacies/pharmacy-1`) - Contains pharmacy details and stock information
2. **Medicines Collection** (`/medicines`) - Flat collection of all medicines with stock details

## Available API Functions

### Pharmacy Functions
- `getAllPharmacies()` - Get all pharmacies
- `getPharmacyById(pharmacyId)` - Get specific pharmacy details
- `getPharmacyStock(pharmacyId)` - Get pharmacy stock details (defaults to 'pharmacy-1')
- `subscribeToPharmacyStock(pharmacyId, callback)` - Real-time pharmacy stock updates

### Medicine Functions
- `getAllMedicines()` - Get all medicines from the flat collection
- `getMedicineById(medicineId)` - Get specific medicine details
- `searchMedicines(searchTerm)` - Search medicines by name
- `getMedicinesByCategory(category)` - Get medicines by category
- `getLowStockMedicines(threshold)` - Get medicines with low stock (default threshold: 10)
- `subscribeToMedicines(callback)` - Real-time medicines updates

## Testing the Integration

1. **Start your development server:**
   ```bash
   npm start
   ```

2. **Navigate to the test page:**
   ```
   http://localhost:3000/test-pharmacy
   ```

3. **Test the following features:**
   - Load all pharmacies
   - Load pharmacy-1 stock details
   - Load all medicines
   - Search medicines by name
   - Load low stock medicines

## Admin Access

The admin account has been configured:
- **Email:** admin@nabha.gov.in
- **Password:** admin123

## Database Structure

### Pharmacies Collection (`/pharmacies`)
```
pharmacy-1/
  ├── name: "Pharmacy Name"
  ├── address: "Pharmacy Address"
  ├── phone: "Contact Number"
  └── stock: {
      "medicine-id-1": {
        name: "Medicine Name",
        quantity: 100,
        price: 25.50,
        category: "Category"
      }
    }
```

### Medicines Collection (`/medicines`)
```
medicine-id-1/
  ├── name: "Medicine Name"
  ├── category: "Category"
  ├── stock: 100
  ├── price: 25.50
  ├── description: "Medicine Description"
  └── manufacturer: "Manufacturer Name"
```

## Usage Examples

### Import the functions in your components:
```javascript
import { 
  getAllPharmacies, 
  getPharmacyStock, 
  getAllMedicines, 
  searchMedicines 
} from '../services/api';
```

### Load pharmacy data:
```javascript
const loadPharmacyData = async () => {
  try {
    const pharmacies = await getAllPharmacies();
    const pharmacyStock = await getPharmacyStock('pharmacy-1');
    const medicines = await getAllMedicines();
    
    console.log('Pharmacies:', pharmacies);
    console.log('Pharmacy Stock:', pharmacyStock);
    console.log('Medicines:', medicines);
  } catch (error) {
    console.error('Error loading pharmacy data:', error);
  }
};
```

### Search medicines:
```javascript
const searchMedicinesByName = async (searchTerm) => {
  try {
    const results = await searchMedicines(searchTerm);
    console.log('Search results:', results);
  } catch (error) {
    console.error('Error searching medicines:', error);
  }
};
```

### Real-time updates:
```javascript
import { subscribeToMedicines } from '../services/api';

useEffect(() => {
  const unsubscribe = subscribeToMedicines((medicines) => {
    console.log('Medicines updated:', medicines);
    setMedicines(medicines);
  });

  return () => unsubscribe();
}, []);
```

## Notes

- Both databases are in the same Firebase project (`nabhacare-48e2c`)
- No additional Firebase configuration is needed
- The pharmacy data is automatically synced from the NabhaPharmacies project via Cloud Functions
- All functions include proper error handling and logging
- Real-time listeners are available for live updates

## Next Steps

1. Test the integration using the test page
2. Integrate pharmacy data into your existing components
3. Create pharmacy-specific UI components
4. Implement stock management features
5. Add medicine search functionality to your main application



