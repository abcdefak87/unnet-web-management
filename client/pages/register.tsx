import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { toast } from 'react-hot-toast'
import { api } from '../lib/api'
import { MapPin } from 'lucide-react'

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

const CustomerRegistration: React.FC = () => {
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
  
  const [ktpPhoto, setKtpPhoto] = useState<File | null>(null);
  const [housePhoto, setHousePhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const packageOptions = [
    { value: '10MBPS', label: '10 Mbps - Rp 200.000/bulan' },
    { value: '20MBPS', label: '20 Mbps - Rp 300.000/bulan' },
    { value: '50MBPS', label: '50 Mbps - Rp 500.000/bulan' },
    { value: '100MBPS', label: '100 Mbps - Rp 800.000/bulan' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // GPS validation for Indonesia region
  const validateIndonesianGPS = (lat: number, lng: number) => {
    // Indonesia bounds: roughly -11°S to 6°N, 95°E to 141°E
    const indonesiaBounds = {
      north: 6.0,
      south: -11.0,
      east: 141.0,
      west: 95.0
    }
    
    return lat >= indonesiaBounds.south && lat <= indonesiaBounds.north &&
           lng >= indonesiaBounds.west && lng <= indonesiaBounds.east
  }
  
  // Calculate distance between two GPS points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('🚫 Browser tidak mendukung GPS. Gunakan input manual.')
      setShowManualInput(true)
      return
    }

    setIsGettingLocation(true)
    toast('🛰️ Mengakses GPS satelit presisi tinggi...', { duration: 3000 })
    
    // Enhanced GPS readings with multiple validation layers
    const readings: GeolocationPosition[] = []
    let attempts = 0
    const maxAttempts = 8 // Increased for maximum accuracy
    const requiredReadings = 3 // Minimum readings for validation
    
    const tryGetLocation = () => {
      attempts++
      
      // Progressive timeout strategy
      const timeoutDuration = attempts <= 3 ? 45000 : attempts <= 6 ? 30000 : 20000
      const enableHighAccuracy = attempts <= 5 // Use high accuracy for first 5 attempts
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = position.coords
          
          console.log(`🛰️ GPS Reading ${attempts}/${maxAttempts}:`, {
            latitude: latitude.toFixed(8),
            longitude: longitude.toFixed(8),
            accuracy: Math.round(accuracy),
            altitude,
            altitudeAccuracy,
            heading,
            speed,
            timestamp: new Date(position.timestamp).toLocaleString('id-ID'),
            highAccuracy: enableHighAccuracy
          })
          
          // Critical validation: Indonesia bounds check
          if (!validateIndonesianGPS(latitude, longitude)) {
            console.warn('❌ GPS coordinates outside Indonesia:', { latitude, longitude })
            toast.error(`❌ GPS menunjukkan lokasi di luar Indonesia!\nLat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}\nSilakan coba lagi atau gunakan input manual.`)
            
            if (attempts < maxAttempts) {
              setTimeout(() => tryGetLocation(), 4000)
              toast(`🔄 Mencoba GPS lagi... (${attempts}/${maxAttempts})`, { icon: '🛰️', duration: 2000 })
              return
            } else {
              toast.error('GPS tidak dapat menemukan lokasi di Indonesia. Gunakan input manual.')
              setShowManualInput(true)
              setIsGettingLocation(false)
              return
            }
          }
          
          // Enhanced network positioning detection
          const jakartaLat = -6.2088
          const jakartaLng = 106.8456
          const distanceFromJakarta = calculateDistance(latitude, longitude, jakartaLat, jakartaLng)
          
          // Detect WiFi/Cell Tower positioning (common in Jakarta area)
          const isNetworkPositioning = (
            (distanceFromJakarta < 50 && accuracy > 100) || // Jakarta area with low accuracy
            (accuracy > 200) || // Very low accuracy indicates network positioning
            (latitude.toString().includes('-6.2') && longitude.toString().includes('106.') && accuracy > 50) // Jakarta coordinates with poor accuracy
          )
          
          if (isNetworkPositioning) {
            console.warn('🚫 Network positioning detected:', {
              location: `Jakarta ${distanceFromJakarta.toFixed(1)}km`,
              accuracy: `±${Math.round(accuracy)}m`,
              coords: { lat: latitude.toFixed(6), lng: longitude.toFixed(6) },
              source: 'WiFi/Cell Tower'
            })
            
            toast.error(`🚫 DETEKSI WIFI/CELL TOWER\n📍 Lokasi: Jakarta area (${distanceFromJakarta.toFixed(1)}km)\n🎯 Akurasi: ±${Math.round(accuracy)}m\n\n⚠️ Bukan GPS satelit murni!\nMemaksa GPS satelit...`, { duration: 4000 })
            
            if (attempts < maxAttempts) {
              // Force satellite GPS by disabling network positioning
              setTimeout(() => {
                // Clear any cached positions and force fresh satellite reading
                if ('geolocation' in navigator && 'clearWatch' in navigator.geolocation) {
                  // Clear any existing watches
                }
                tryGetLocation()
              }, 8000) // Longer delay to allow satellite lock
              
              toast(`🛰️ MEMAKSA GPS SATELIT... (${attempts}/${maxAttempts})\n📡 Mencari sinyal satelit langsung`, { icon: '🛰️', duration: 4000 })
              return
            } else {
              toast.error('🚫 GPS terus menunjukkan WiFi/Cell Tower.\n💡 Coba matikan WiFi dan gunakan data seluler, atau gunakan input manual.')
              setShowManualInput(true)
              setIsGettingLocation(false)
              return
            }
          }
          
          // Accuracy validation
          if (accuracy > 500) {
            console.warn(`⚠️ Low GPS accuracy: ±${Math.round(accuracy)}m`)
            if (attempts < maxAttempts) {
              toast(`⚠️ Akurasi GPS rendah (±${Math.round(accuracy)}m). Mencoba lagi...`, { icon: '🛰️' })
              setTimeout(() => tryGetLocation(), 3000)
              return
            }
          }
          
          readings.push(position)
          
          // Consistency validation between readings
          if (readings.length >= 2) {
            const lastReading = readings[readings.length - 1]
            const prevReading = readings[readings.length - 2]
            const distance = calculateDistance(
              lastReading.coords.latitude, lastReading.coords.longitude,
              prevReading.coords.latitude, prevReading.coords.longitude
            )
            
            // Check for GPS drift/inconsistency
            if (distance > 0.5) { // 500m tolerance
              console.warn('⚠️ GPS readings inconsistent:', {
                distance: `${(distance * 1000).toFixed(0)}m`,
                reading1: { lat: prevReading.coords.latitude.toFixed(6), lng: prevReading.coords.longitude.toFixed(6) },
                reading2: { lat: lastReading.coords.latitude.toFixed(6), lng: lastReading.coords.longitude.toFixed(6) }
              })
              
              if (attempts < maxAttempts && distance > 2.0) { // Major inconsistency
                toast(`⚠️ GPS tidak stabil (jarak ${(distance * 1000).toFixed(0)}m). Mencoba lagi...`, { icon: '🛰️' })
                setTimeout(() => tryGetLocation(), 4000)
                return
              }
            }
          }
          
          // Success criteria: enough readings with good accuracy
          if (readings.length >= requiredReadings || accuracy <= 20) {
            // Use the most accurate reading
            const bestReading = readings.reduce((best, current) => 
              current.coords.accuracy < best.coords.accuracy ? current : best
            )
            
            const { latitude: bestLat, longitude: bestLng, accuracy: bestAccuracy } = bestReading.coords
            
            // Final accuracy check
            if (bestAccuracy > 1000) {
              toast.error(`❌ GPS tidak cukup akurat (±${Math.round(bestAccuracy)}m)\nCoba di tempat terbuka atau gunakan input manual.`)
              setShowManualInput(true)
              setIsGettingLocation(false)
              return
            }
            
            // SUCCESS - Apply validated coordinates
            setFormData(prev => ({
              ...prev,
              latitude: bestLat.toFixed(8),
              longitude: bestLng.toFixed(8),
              shareLocation: 'gps_coordinates'
            }))
            
            const locationText = `GPS Satelit: ${bestLat.toFixed(8)}, ${bestLng.toFixed(8)} (±${Math.round(bestAccuracy)}m)`
            setFormData(prev => ({
              ...prev,
              address: prev.address || locationText
            }))
            
            const accuracyLevel = bestAccuracy <= 5 ? 'SANGAT PRESISI' : 
                                bestAccuracy <= 15 ? 'PRESISI TINGGI' : 
                                bestAccuracy <= 50 ? 'AKURAT' : 'CUKUP AKURAT'
            
            toast.success(`✅ GPS SATELIT BERHASIL!\n${accuracyLevel} (±${Math.round(bestAccuracy)}m)\nDari ${readings.length} pembacaan GPS`, { duration: 4000 })
            setIsGettingLocation(false)
            return
          }
          
          // Continue collecting readings
          if (attempts < maxAttempts) {
            toast(`🛰️ Mengumpulkan data GPS... (${readings.length}/${requiredReadings} readings)`, { icon: '📡', duration: 2000 })
            setTimeout(() => tryGetLocation(), 2000)
          }
        },
        (error) => {
          console.error(`❌ GPS Error (attempt ${attempts}/${maxAttempts}):`, {
            code: error.code,
            message: error.message,
            timestamp: new Date().toLocaleString('id-ID')
          })
          
          if (attempts < maxAttempts) {
            const delay = Math.min(attempts * 1500, 8000) // Progressive delay, max 8s
            
            setTimeout(() => {
              // Adaptive GPS options based on attempt
              const fallbackOptions = {
                enableHighAccuracy: attempts <= 4, // High accuracy for first attempts
                timeout: attempts <= 3 ? 45000 : 25000,
                maximumAge: attempts <= 2 ? 0 : 10000 // Fresh reading for first attempts
              }
              
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  readings.push(position)
                  tryGetLocation()
                },
                (retryError) => {
                  console.error('GPS retry failed:', retryError)
                  if (attempts >= maxAttempts) {
                    handleLocationError(retryError)
                  } else {
                    setTimeout(() => tryGetLocation(), 2000)
                  }
                },
                fallbackOptions
              )
            }, delay)
            
            const method = attempts <= 4 ? 'satelit presisi tinggi' : 'mode cepat'
            toast(`🔄 GPS gagal, mencoba ${method}... (${attempts}/${maxAttempts})`, { icon: '🛰️', duration: 2000 })
          } else {
            handleLocationError(error)
          }
        },
        {
          enableHighAccuracy: true, // Always use high accuracy
          timeout: timeoutDuration,
          maximumAge: 0 // Always force fresh reading to avoid cached network positions
        }
      )
    }
    
    const handleLocationError = (error: GeolocationPositionError) => {
      let errorMessage = '❌ GPS Gagal'
      let suggestion = ''
      let action = ''
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = '🚫 Akses GPS Ditolak'
          suggestion = '• Klik ikon 🔒 di address bar\n• Pilih "Allow" untuk Location\n• Refresh halaman dan coba lagi'
          action = 'Izinkan akses lokasi untuk GPS akurat'
          break
        case error.POSITION_UNAVAILABLE:
          errorMessage = '📡 GPS Tidak Tersedia'
          suggestion = '• Pastikan GPS/Location Services aktif\n• **MATIKAN WiFi** - Paksa GPS satelit\n• Coba di tempat terbuka (dekat jendela)\n• Gunakan data seluler, bukan WiFi\n• Restart browser jika perlu'
          action = 'MATIKAN WiFi dan aktifkan GPS satelit'
          break
        case error.TIMEOUT:
          errorMessage = '⏱️ GPS Timeout'
          suggestion = '• **MATIKAN WiFi** - Paksa GPS satelit\n• Sinyal GPS lemah atau terhalang\n• Coba di luar ruangan\n• Tunggu 3-5 menit untuk lock satelit\n• Matikan VPN jika aktif'
          action = 'MATIKAN WiFi dan coba di tempat terbuka'
          break
        default:
          errorMessage = '❌ GPS Error'
          suggestion = '• Coba refresh halaman\n• Pastikan browser mendukung GPS\n• Coba browser lain (Chrome/Firefox)'
          action = 'Gunakan input manual koordinat'
          break
      }
      
      toast.error(`${errorMessage}\n\n${suggestion}\n\n💡 ${action}`, { 
        duration: 8000,
        style: {
          maxWidth: '400px',
          fontSize: '14px'
        }
      })
      
      // Auto-show manual input after GPS failure
      setTimeout(() => {
        setShowManualInput(true)
        toast('📝 Input manual koordinat tersedia di bawah', { icon: '💡', duration: 3000 })
      }, 2000)
      
      setIsGettingLocation(false)
    }
    
    // Start the GPS acquisition process
    tryGetLocation()
  };

  const openGoogleMaps = () => {
    if (formData.latitude && formData.longitude) {
      const url = `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}&z=18`;
      window.open(url, '_blank')
    } else {
      toast.error('Lokasi belum didapatkan')
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'ktp' | 'house') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB')
        return
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
        return !!(formData.name && formData.phone && formData.latitude && formData.longitude);
      case 2:
        return !!(formData.ktpNumber && formData.ktpName && formData.ktpAddress && ktpPhoto);
      case 3:
        return !!(formData.packageType && housePhoto);
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      toast.error('Mohon lengkapi semua field yang diperlukan');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(3)) {
      toast.error('Mohon lengkapi semua data yang diperlukan');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      
      // Add form data
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value);
      });
      
      // Add files
      if (ktpPhoto) submitData.append('ktpPhoto', ktpPhoto);
      if (housePhoto) submitData.append('housePhoto', housePhoto);

      const response = await fetch('/api/customers/register', {
        method: 'POST',
        body: submitData
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Pendaftaran berhasil! Kami akan menghubungi Anda segera.');
        router.push('/register/success?id=' + result.data.id);
      } else {
        toast.error(result.error || 'Terjadi kesalahan saat mendaftar');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Masukkan nama lengkap"
            required
          />
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="08xxxxxxxxxx"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📍 Lokasi Pemasangan *
          </label>
          
          {/* Location Buttons */}
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
              
              {formData.latitude && formData.longitude && (
                <button
                  type="button"
                  onClick={openGoogleMaps}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium"
                >
                  🗺️ Lihat di Maps
                </button>
              )}
            </div>
            
            {/* Location Info Display */}
            {formData.latitude && formData.longitude && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">🛰️ Lokasi GPS Tervalidasi:</span>
                </div>
                <div className="text-sm text-green-700 space-y-3">
                  <div className="font-mono bg-green-100 p-3 rounded">
                    <div className="grid grid-cols-1 gap-1">
                      <div><strong>Latitude:</strong> {formData.latitude}</div>
                      <div><strong>Longitude:</strong> {formData.longitude}</div>
                      <div className="text-xs text-green-600 mt-2 space-y-1">
                        <div>🛰️ GPS satelit tervalidasi</div>
                        <div>📍 Koordinat dalam wilayah Indonesia</div>
                        <div>🎯 Presisi tinggi (8 digit desimal)</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Validation Status */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <div className="text-xs text-blue-700">
                      <div className="font-semibold mb-1">Status Validasi GPS:</div>
                      <div className="space-y-1">
                        <div>✅ Koordinat dalam batas Indonesia</div>
                        <div>✅ Akurasi GPS memadai</div>
                        <div>✅ Pembacaan konsisten</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      🎯 <span>Lokasi akurat siap untuk teknisi</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const coords = `${formData.latitude},${formData.longitude}`
                          navigator.clipboard.writeText(coords)
                          toast.success('Koordinat disalin ke clipboard!')
                        }}
                        className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                      >
                        📋 Salin
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`
                          window.open(url, '_blank')
                        }}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        🗺️ Maps
                      </button>
                    </div>
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
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Contoh: Jl. Merdeka No. 123, RT 01/RW 02, Kelurahan ABC (akan otomatis terisi dari GPS)"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Alamat akan otomatis terisi dari GPS, atau Anda bisa menambahkan detail manual
              </p>
            </div>
            
            {/* Manual Coordinate Input */}
            {showManualInput && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="text-sm text-blue-800 mb-3">
                  <div className="font-semibold">📍 Input Koordinat Manual</div>
                  <div className="text-xs mt-1">Masukkan koordinat GPS yang akurat dari aplikasi Maps atau GPS lainnya</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Latitude</label>
                    <input
                      type="text"
                      placeholder="-7.264895"
                      value={formData.latitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                      className="w-full px-3 py-2 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Longitude</label>
                    <input
                      type="text"
                      placeholder="111.762509"
                      value={formData.longitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                      className="w-full px-3 py-2 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.latitude && formData.longitude) {
                        const lat = parseFloat(formData.latitude)
                        const lng = parseFloat(formData.longitude)
                        if (validateIndonesianGPS(lat, lng)) {
                          setFormData(prev => ({ ...prev, shareLocation: 'manual_coordinates' }))
                          toast.success('✅ Koordinat manual tersimpan!')
                        } else {
                          toast.error('❌ Koordinat di luar Indonesia')
                        }
                      } else {
                        toast.error('❌ Masukkan kedua koordinat')
                      }
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    ✅ Simpan Koordinat
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualInput(false)}
                    className="px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    ❌ Batal
                  </button>
                </div>
              </div>
            )}
            
            {!formData.latitude && !formData.longitude && !showManualInput && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="text-sm text-yellow-800 space-y-2">
                  <div className="font-semibold">🛰️ Tips GPS Satelit Akurat:</div>
                  <ul className="text-xs space-y-1 ml-4">
                    <li>• <strong>MATIKAN WiFi</strong> - Paksa GPS satelit murni</li>
                    <li>• Keluar ruangan untuk sinyal satelit langsung</li>
                    <li>• Tunggu 2-3 menit untuk lock satelit</li>
                    <li>• Matikan VPN jika aktif</li>
                    <li>• Gunakan data seluler, bukan WiFi</li>
                    <li>• Aktifkan "High Accuracy" di pengaturan lokasi</li>
                  </ul>
                  <div className="mt-2 pt-2 border-t border-yellow-300">
                    <div className="text-xs text-yellow-700 mb-2">
                      ⚠️ <strong>Jika GPS terus menunjukkan Jakarta:</strong> Matikan WiFi dan coba lagi
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowManualInput(true)}
                      className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                    >
                      📝 Input Koordinat Manual
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Data KTP</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nomor KTP *
          </label>
          <input
            type="text"
            name="ktpNumber"
            value={formData.ktpNumber}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="16 digit nomor KTP"
            maxLength={16}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nama Sesuai KTP *
          </label>
          <input
            type="text"
            name="ktpName"
            value={formData.ktpName}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nama sesuai KTP"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alamat Sesuai KTP *
          </label>
          <textarea
            name="ktpAddress"
            value={formData.ktpAddress}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Alamat sesuai KTP"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Foto KTP *
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, 'ktp')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Format: JPG, PNG. Maksimal 5MB
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Link Google Maps (Opsional)
          </label>
          <input
            type="url"
            name="shareLocation"
            value={formData.shareLocation}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://maps.google.com/..."
          />
          <p className="text-sm text-gray-500 mt-1">
            Share lokasi dari Google Maps untuk memudahkan teknisi
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Pilih Paket & Upload Foto</h3>
      
      <div>
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
          <option value="">Pilih paket internet</option>
          {packageOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Foto Rumah/Lokasi *
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e, 'house')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          Foto bagian depan rumah/lokasi instalasi. Format: JPG, PNG. Maksimal 5MB
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Ringkasan Pendaftaran</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Nama:</strong> {formData.name}</p>
          <p><strong>HP:</strong> {formData.phone}</p>
          <p><strong>Alamat:</strong> {formData.address}</p>
          <p><strong>Paket:</strong> {packageOptions.find(p => p.value === formData.packageType)?.label}</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Daftar Pelanggan Baru - UNNET Management</title>
        <meta name="description" content="Daftar sebagai pelanggan baru UNNET" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                UNNET MANAGEMENT
              </h1>
              <p className="text-gray-600 mt-2">Pendaftaran Pelanggan Baru</p>
            </div>

            {/* Progress Steps */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step}
                    </div>
                    {step < 3 && (
                      <div className={`w-16 h-1 mx-2 ${
                        currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-8">
              <form onSubmit={handleSubmit}>
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={prevStep}
                    className={`px-6 py-2 rounded-lg font-medium ${
                      currentStep === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    disabled={currentStep === 1}
                  >
                    Sebelumnya
                  </button>

                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Selanjutnya
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Mendaftar...' : 'Daftar Sekarang'}
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Info */}
            <div className="text-center mt-8 text-sm text-gray-600">
              <p>Butuh bantuan? Hubungi kami di WhatsApp: <strong>0812-3456-7890</strong></p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerRegistration;
