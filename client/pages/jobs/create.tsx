import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../contexts/AuthContext'
import Layout from '../../components/Layout'
import ProtectedRoute from '../../components/ProtectedRoute'
import QuickAddCustomerModal from '../../components/QuickAddCustomerModal'
import { api } from '../../lib/api'
import { Upload, MapPin, User, Phone, FileText, Camera, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

interface JobForm {
  type: 'INSTALLATION' | 'REPAIR'
  customerId: string
  problemType?: string
  description?: string
  scheduledDate: string
  housePhoto?: FileList
  customerIdPhoto?: FileList
}

export default function CreateJob() {
  const { user } = useAuth()
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [showQuickAddModal, setShowQuickAddModal] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<JobForm>()

  const selectedCustomerId = watch('customerId')
  const selectedCustomer = customers.find(c => c.id.toString() === selectedCustomerId)

  const jobType = watch('type')

  useEffect(() => {
    fetchCustomers()
    // Set default date to now
    const now = new Date()
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    setValue('scheduledDate', localDateTime)
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers')
      setCustomers(response.data.data.customers || [])
    } catch (error) {
      console.error('Failed to fetch customers:', error)
      toast.error('Gagal memuat data pelanggan')
    } finally {
      setLoadingCustomers(false)
    }
  }

  const handleCustomerAdded = (newCustomer: any) => {
    setCustomers(prev => [...prev, newCustomer])
    // Auto-select the newly added customer
    const form = document.querySelector('select[name="customerId"]') as HTMLSelectElement
    if (form) {
      form.value = newCustomer.id.toString()
    }
  }

  const onSubmit = async (data: JobForm) => {
    setIsLoading(true)
    try {
      console.log('=== FRONTEND DEBUG ===');
      console.log('Form data before FormData creation:', data);
      
      const formData = new FormData()
      
      // Add basic job data
      formData.append('type', data.type)
      formData.append('customerId', data.customerId)
      // Get address from selected customer
      const customer = customers.find(c => c.id.toString() === data.customerId)
      const customerAddress = customer?.address || ''
      formData.append('address', customerAddress)
      if (data.type === 'REPAIR') {
        formData.append('problemType', data.problemType || '')
      }
      formData.append('scheduledDate', data.scheduledDate)
      
      console.log('FormData entries:');
      formData.forEach((value, key) => {
        console.log(key, value);
      });

      // Add photos for installation jobs
      if (data.type === 'INSTALLATION') {
        if (data.housePhoto?.[0]) {
          formData.append('housePhoto', data.housePhoto[0])
        }
        if (data.customerIdPhoto?.[0]) {
          formData.append('customerIdPhoto', data.customerIdPhoto[0])
        }
      }

      // Remove Content-Type header to let browser set it automatically with boundary
      const response = await api.post('/jobs', formData)

      toast.success('Job berhasil dibuat!')
      router.push('/jobs')
    } catch (error: any) {
      const message = error.response?.data?.error || 'Gagal membuat job'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <Layout title="Buat Job Baru">
        <div className="max-w-4xl mx-auto">
          <div className="card p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Buat Job Baru</h1>
              <p className="text-gray-600">Buat job pemasangan atau perbaikan baru</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Job Type */}
              <div>
                <label className="form-label">Tipe Job *</label>
                <select
                  {...register('type', { required: 'Tipe job wajib dipilih' })}
                  className="form-input"
                >
                  <option value="">Pilih tipe job</option>
                  <option value="INSTALLATION">Pemasangan</option>
                  <option value="REPAIR">Perbaikan</option>
                </select>
                {errors.type && (
                  <p className="form-error">{errors.type.message}</p>
                )}
              </div>

              {/* Customer */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="form-label">Pelanggan *</label>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddModal(true)}
                    className="inline-flex items-center px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah Pelanggan
                  </button>
                </div>
                {loadingCustomers ? (
                  <div className="form-input flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                    Memuat pelanggan...
                  </div>
                ) : (
                  <select
                    {...register('customerId', { required: 'Pelanggan wajib dipilih' })}
                    className="form-input"
                  >
                    <option value="">Pilih pelanggan</option>
                    {customers.map((customer: any) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </select>
                )}
                {errors.customerId && (
                  <p className="form-error">{errors.customerId.message}</p>
                )}
              </div>

              {/* Customer Address Display */}
              {selectedCustomer && (
                <div>
                  <label className="form-label">Alamat Pelanggan</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <div className="form-input pl-10 bg-gray-50 min-h-[80px] flex items-start pt-3">
                      <span className="text-gray-700">
                        {selectedCustomer.address || 'Alamat belum tersedia'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Alamat diambil otomatis dari data pelanggan
                  </p>
                </div>
              )}

              {/* Problem Type for REPAIR only */}
              {jobType === 'REPAIR' && (
                <div>
                  <label className="form-label">Jenis Masalah *</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <select
                      {...register('problemType', { required: 'Jenis masalah wajib dipilih' })}
                      className="form-input pl-10"
                    >
                      <option value="">Pilih jenis masalah</option>
                      <option value="modem_rusak">Modem Rusak</option>
                      <option value="kabel_putus">Kabel Putus</option>
                      <option value="redaman_tinggi">Redaman Tinggi</option>
                      <option value="ganti_modem_cas">Ganti Modem/CAS Rusak</option>
                      <option value="Masalah Settingan">Masalah Settingan</option>
                    </select>
                  </div>
                  {errors.problemType && (
                    <p className="form-error">{errors.problemType.message}</p>
                  )}
                </div>
              )}


              {/* Scheduled Date */}
              <div>
                <label className="form-label">Tanggal Dijadwalkan *</label>
                <input
                  type="datetime-local"
                  {...register('scheduledDate', { required: 'Tanggal wajib diisi' })}
                  className="form-input"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Otomatis diisi dengan waktu saat ini
                </p>
                {errors.scheduledDate && (
                  <p className="form-error">{errors.scheduledDate.message}</p>
                )}
              </div>


              {/* Photos for Installation */}
              {jobType === 'INSTALLATION' && (
                <div className="space-y-4">
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Foto Wajib untuk Pemasangan
                    </h3>
                  </div>

                  {/* House Photo */}
                  <div>
                    <label className="form-label">Foto Rumah *</label>
                    <div className="relative">
                      <Camera className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="file"
                        accept="image/*"
                        {...register('housePhoto', {
                          required: jobType === 'INSTALLATION' ? 'Foto rumah wajib untuk pemasangan' : false
                        })}
                        className="form-input pl-10"
                      />
                    </div>
                    {errors.housePhoto && (
                      <p className="form-error">{errors.housePhoto.message}</p>
                    )}
                  </div>

                  {/* Customer ID Photo */}
                  <div>
                    <label className="form-label">Foto KTP Pelanggan *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="file"
                        accept="image/*"
                        {...register('customerIdPhoto', {
                          required: jobType === 'INSTALLATION' ? 'Foto KTP wajib untuk pemasangan' : false
                        })}
                        className="form-input pl-10"
                      />
                    </div>
                    {errors.customerIdPhoto && (
                      <p className="form-error">{errors.customerIdPhoto.message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn-outline"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Membuat Job...
                    </div>
                  ) : (
                    'Buat Job'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Quick Add Customer Modal */}
        <QuickAddCustomerModal
          isOpen={showQuickAddModal}
          onClose={() => setShowQuickAddModal(false)}
          onCustomerAdded={handleCustomerAdded}
        />
      </Layout>
    </ProtectedRoute>
  )
}

