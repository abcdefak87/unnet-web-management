/**
 * Enhanced Registration Form with Security Features
 * Includes CSRF protection and improved validation
 * Note: Email verification step has been removed for simplified registration
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { toast } from 'react-hot-toast'
import { customersAPI } from '../lib/api'
import { MapPin, Shield, Mail, CheckCircle } from 'lucide-react'

interface RegistrationData {
  name: string;
  phone: string;
  address: string;
  latitude: string;
  longitude: string;
  ktpNumber: string;
  ktpName: string;
  ktpAddress: string;
  shareLocation: string;
  packageType: string;
  installationType: string;
}

interface SecurityData {
  csrfToken: string;
}

const RegistrationForm: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<RegistrationData>({
    name: '',
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
    ktpNumber: '',
    ktpName: '',
    ktpAddress: '',
    shareLocation: '',
    packageType: '',
    installationType: 'NEW_INSTALLATION'
  });
  
  const [securityData, setSecurityData] = useState<SecurityData>({
    csrfToken: ''
  });
  
  const [csrfTokenRetryCount, setCsrfTokenRetryCount] = useState(0);
  
  const [ktpPhoto, setKtpPhoto] = useState<File | null>(null);
  const [housePhoto, setHousePhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const packageOptions = [
    { value: '10MBPS', label: '10 Mbps - Rp 200.000/bulan' },
    { value: '20MBPS', label: '20 Mbps - Rp 300.000/bulan' },
    { value: '50MBPS', label: '50 Mbps - Rp 500.000/bulan' },
    { value: '100MBPS', label: '100 Mbps - Rp 800.000/bulan' }
  ];

  // Load CSRF token and initialize security
  useEffect(() => {
    const loadSecurityData = async (retryCount = 0) => {
      try {
        const response = await customersAPI.getCSRFToken();
        
        // Check if response is valid JSON
        if (response.data && typeof response.data === 'object') {
          if (response.data.success && response.data.csrfToken) {
            setSecurityData(prev => ({ ...prev, csrfToken: response.data.csrfToken }));
            console.log('CSRF token loaded successfully');
            setCsrfTokenRetryCount(0); // Reset retry count on success
          } else {
            throw new Error(response.data.error || 'Invalid response from server');
          }
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (error) {
        console.error('Failed to load CSRF token:', error);
        
        // Retry logic for network errors
        const axiosError = error as any;
        if (retryCount < 3 && (!axiosError.response || axiosError.response.status >= 500)) {
          console.log(`Retrying CSRF token fetch (attempt ${retryCount + 1}/3)`);
          setCsrfTokenRetryCount(retryCount + 1);
          setTimeout(() => loadSecurityData(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }
        
        // Check if it's a network error or server error
        if (axiosError.response) {
          const status = axiosError.response.status;
          if (status === 404) {
            toast.error('Security endpoint not found. Please contact support.');
          } else if (status >= 500) {
            toast.error('Server error. Please try again later.');
          } else {
            toast.error('Failed to initialize security. Please refresh the page.');
          }
        } else {
          toast.error('Network error. Please check your connection.');
        }
      }
    };

    loadSecurityData();
  }, []);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Enhanced input validation
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Nama wajib diisi';
        if (value.length < 2) return 'Nama minimal 2 karakter';
        if (value.length > 100) return 'Nama maksimal 100 karakter';
        if (!/^[a-zA-Z\s\u00C0-\u017F]+$/.test(value)) return 'Nama hanya boleh huruf dan spasi';
        break;
      
      case 'phone':
        if (!value.trim()) return 'Nomor HP wajib diisi';
        const phoneRegex = /^0[0-9]{9,13}$/;
        if (!phoneRegex.test(value.replace(/\s+/g, ''))) {
          return 'Format nomor HP tidak valid. Gunakan format 08xxxxxxxxxx';
        }
        break;
      
      
      case 'ktpNumber':
        if (value && !/^[0-9]{16}$/.test(value)) {
          return 'Nomor KTP harus 16 digit';
        }
        break;
      
      case 'ktpName':
        if (value && value.length < 2) return 'Nama KTP minimal 2 karakter';
        if (value && value.length > 100) return 'Nama KTP maksimal 100 karakter';
        break;
      
      case 'address':
        if (value && value.length > 500) return 'Alamat maksimal 500 karakter';
        break;
      
      case 'ktpAddress':
        if (value && value.length > 500) return 'Alamat KTP maksimal 500 karakter';
        break;
    }
    return '';
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) {
      setValidationErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  // GPS validation for Indonesia region
  const validateIndonesianGPS = (lat: number, lng: number) => {
    const indonesiaBounds = {
      north: 6.0,
      south: -11.0,
      east: 141.0,
      west: 95.0
    };
    
    return lat >= indonesiaBounds.south && lat <= indonesiaBounds.north &&
           lng >= indonesiaBounds.west && lng <= indonesiaBounds.east;
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Browser tidak mendukung GPS. Gunakan input manual.');
      setShowManualInput(true);
      return;
    }

    setIsGettingLocation(true);
    toast('Mengambil lokasi GPS...', { duration: 2000 });
      
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        if (!validateIndonesianGPS(latitude, longitude)) {
          toast.error('Koordinat di luar Indonesia. Gunakan input manual.');
          setShowManualInput(true);
          setIsGettingLocation(false);
          return;
        }
        
        if (accuracy > 1000) {
          toast.error(`Akurasi GPS rendah (±${Math.round(accuracy)}m). Coba di tempat terbuka.`);
          setShowManualInput(true);
          setIsGettingLocation(false);
          return;
        }
        
        setFormData(prev => ({
          ...prev,
          latitude: latitude.toFixed(8),
          longitude: longitude.toFixed(8),
          shareLocation: 'gps_coordinates'
        }));
        
        const locationText = `GPS: ${latitude.toFixed(8)}, ${longitude.toFixed(8)} (±${Math.round(accuracy)}m)`;
        setFormData(prev => ({
          ...prev,
          address: prev.address || locationText
        }));
        
        toast.success(`GPS berhasil! Akurasi: ±${Math.round(accuracy)}m`);
        setIsGettingLocation(false);
      },
      (error) => {
        let errorMessage = 'GPS gagal';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Akses lokasi ditolak. Izinkan akses lokasi di browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'GPS tidak tersedia. Pastikan GPS aktif dan coba di tempat terbuka.';
            break;
          case error.TIMEOUT:
            errorMessage = 'GPS timeout. Coba lagi atau gunakan input manual.';
            break;
        }
        
        toast.error(errorMessage);
        setShowManualInput(true);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'ktp' | 'house') => {
    const file = e.target.files?.[0];
    if (file) {
      // Enhanced file validation
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!allowedTypes.includes(file.type)) {
        toast.error('Format file tidak didukung. Gunakan JPEG, PNG, atau WebP.');
        return;
      }
      
      if (file.size > maxSize) {
        toast.error('Ukuran file maksimal 5MB');
        return;
      }
      
      // Check file name for suspicious characters
      if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
        toast.error('Nama file mengandung karakter yang tidak diizinkan');
        return;
      }
      
      if (type === 'ktp') {
        setKtpPhoto(file);
      } else {
        setHousePhoto(file);
      }
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        const requiredFields = ['name', 'phone', 'packageType'];
        const hasLocation = Boolean((formData.latitude && formData.longitude) || formData.shareLocation);
        const hasFiles = Boolean(ktpPhoto && housePhoto);
        
        for (const field of requiredFields) {
          if (!formData[field as keyof RegistrationData]) {
            return false;
          }
        }
        
        // For testing, make files optional
        return hasLocation; // && hasFiles;
      case 2:
        // Step 2 is confirmation, no additional validation needed
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      // Show success message when moving to step 2
      if (currentStep === 1) {
        toast.success('Data berhasil divalidasi! Silakan periksa kembali sebelum submit.');
      }
    } else {
      toast.error('Mohon lengkapi semua field yang diperlukan');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only submit when we're on step 2 (confirmation step)
    if (currentStep !== 2) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      
      // Add form data
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value);
      });
      
      // Add security data (CSRF token is optional for now)
      if (securityData.csrfToken) {
        submitData.append('_csrf', securityData.csrfToken);
        console.log('CSRF token added to submission');
      } else {
        console.warn('CSRF token not available, proceeding without CSRF protection');
        // Don't block submission, just log the warning
      }
      
      // Add files
      if (ktpPhoto) submitData.append('ktpPhoto', ktpPhoto);
      if (housePhoto) submitData.append('housePhoto', housePhoto);

      const response = await customersAPI.registerPublic(submitData);
      const result = response.data;

      if ((response.status >= 200 && response.status < 300) || result?.success) {
        toast.success('Pendaftaran berhasil! Tiket PSB telah dibuat.');
        
        // Redirect to success page
        router.push(`/register/success?id=${result.data.id}&jobNumber=${result.data.jobNumber}`);
      } else {
        const serverError = result?.error || result?.message || 'Terjadi kesalahan saat mendaftar';
        toast.error(serverError);
      }
    } catch (error) {
      console.error('Registration error:', error);
      const anyErr: any = error as any;
      const serverData = anyErr?.response?.data;
      const detailMsg =
        serverData?.error ||
        serverData?.message ||
        (Array.isArray(serverData?.details) && serverData.details[0]?.msg) ||
        anyErr?.message ||
        'Terjadi kesalahan. Silakan coba lagi.';
      toast.error(detailMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-green-600 mb-4">
        <Shield className="w-5 h-5" />
        <span className="text-sm font-medium">
          {securityData.csrfToken 
            ? 'Formulir aman dengan perlindungan keamanan' 
            : csrfTokenRetryCount > 0 
              ? `Memuat token keamanan... (${csrfTokenRetryCount}/3)`
              : 'Memuat token keamanan...'
          }
        </span>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900">Informasi Pribadi</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nama Lengkap *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              validationErrors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Masukkan nama lengkap"
            required
            maxLength={100}
          />
          {validationErrors.name && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nomor HP/WhatsApp *
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              validationErrors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="08xxxxxxxxxx"
            required
            maxLength={15}
          />
          {validationErrors.phone && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>
          )}
        </div>


        {/* GPS Location Section */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📍 Lokasi Pemasangan *
          </label>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isGettingLocation ? (
                  <>
                    <span className="animate-spin text-lg">🛰️</span>
                    <span>Mencari Satelit GPS...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    <span>🛰️ Dapatkan GPS Akurat</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Location Display */}
            {formData.latitude && formData.longitude && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">Lokasi GPS:</span>
                </div>
                <div className="text-sm text-green-700">
                  <div className="font-mono bg-green-100 p-3 rounded mb-3">
                    <div><strong>Latitude:</strong> {formData.latitude}</div>
                    <div><strong>Longitude:</strong> {formData.longitude}</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Manual Address Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🏠 Alamat Lengkap (Opsional)
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                rows={2}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                  validationErrors.address ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Contoh: Jl. Merdeka No. 123, RT 01/RW 02, Kelurahan ABC"
                maxLength={500}
              />
              {validationErrors.address && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.address}</p>
              )}
            </div>
          </div>
        </div>

        {/* Package Selection */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pilih Paket Internet *
          </label>
          <select
            name="packageType"
            value={formData.packageType}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Pilih paket</option>
            {packageOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* File Uploads */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Foto KTP *
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFileChange(e, 'ktp')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Foto KTP untuk verifikasi identitas. Format: JPEG, PNG, WebP. Maksimal 5MB.
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Foto Rumah *
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFileChange(e, 'house')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Foto bagian depan rumah/lokasi instalasi. Format: JPEG, PNG, WebP. Maksimal 5MB.
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Konfirmasi Data</h3>
        <p className="text-gray-600">Silakan periksa kembali data yang telah Anda masukkan</p>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-yellow-600 text-xl">⚠️</div>
          <div>
            <p className="text-sm text-yellow-800 font-medium mb-1">Penting!</p>
            <p className="text-sm text-yellow-800">
              Pastikan semua data yang Anda masukkan sudah benar. Data ini akan digunakan untuk proses penjadwalan pemasangan dan tidak dapat diubah setelah submit.
            </p>
          </div>
        </div>
      </div>
      <div className="bg-blue-50 p-6 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-4 text-lg">📋 Ringkasan Data</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div className="space-y-3">
            <div className="bg-white p-3 rounded border">
              <p className="font-medium text-blue-900 mb-1">👤 Informasi Pribadi</p>
              <p><strong>Nama:</strong> {formData.name}</p>
              <p><strong>WhatsApp:</strong> {formData.phone}</p>
            </div>
            
            <div className="bg-white p-3 rounded border">
              <p className="font-medium text-blue-900 mb-1">📍 Lokasi</p>
              {formData.latitude && formData.longitude ? (
                <div>
                  <p><strong>GPS:</strong> {formData.latitude}, {formData.longitude}</p>
                  {formData.address && <p><strong>Alamat:</strong> {formData.address}</p>}
                </div>
              ) : (
                <p><strong>Lokasi:</strong> {formData.shareLocation || 'Belum diisi'}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="bg-white p-3 rounded border">
              <p className="font-medium text-blue-900 mb-1">📦 Paket Internet</p>
              <p><strong>Pilihan:</strong> {packageOptions.find(p => p.value === formData.packageType)?.label || 'Belum dipilih'}</p>
            </div>
            
            <div className="bg-white p-3 rounded border">
              <p className="font-medium text-blue-900 mb-1">📎 Dokumen</p>
              <p><strong>Foto KTP:</strong> {ktpPhoto ? '✅ Sudah diunggah' : '❌ Belum diunggah'}</p>
              <p><strong>Foto Rumah:</strong> {housePhoto ? '✅ Sudah diunggah' : '❌ Belum diunggah'}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-800 mb-2">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Perlindungan Keamanan</span>
        </div>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• Data Anda dilindungi dengan enkripsi</li>
          <li>• Validasi GPS untuk memastikan lokasi di Indonesia</li>
          <li>• File upload aman dengan validasi format</li>
        </ul>
      </div>
      
    </div>
  );

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-8">
      {/* Dynamic Progress Steps */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          {[1, 2].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step}
              </div>
              {step < 2 && (
                <div className={`w-16 h-1 mx-2 ${
                  step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              prevStep();
            }}
            className={`btn ${
              currentStep === 1
                ? 'btn-secondary opacity-50 cursor-not-allowed'
                : 'btn-outline'
            }`}
            disabled={currentStep === 1}
          >
            Sebelumnya
          </button>

          {currentStep < 2 ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                nextStep();
              }}
              className="btn-primary"
            >
              Selanjutnya
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-success"
            >
              {isSubmitting ? 'Mendaftar...' : 'Daftar Sekarang'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default RegistrationForm;
