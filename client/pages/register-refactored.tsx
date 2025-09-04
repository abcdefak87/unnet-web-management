import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { toast } from 'react-hot-toast';
import { api } from '../lib/api';
import { RegistrationData } from '../types/registration';
import { LocationStep } from '../components/forms/LocationStep';
import { KTPStep } from '../components/forms/KTPStep';
import { PackageStep } from '../components/forms/PackageStep';
import { StepIndicator } from '../components/ui/StepIndicator';

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
  const [currentStep, setCurrentStep] = useState(1);

  const stepTitles = ['Lokasi', 'Data KTP', 'Paket & Foto'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'ktp' | 'house') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB');
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

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <LocationStep formData={formData} setFormData={setFormData} />;
      case 2:
        return (
          <KTPStep 
            formData={formData} 
            setFormData={setFormData}
            ktpPhoto={ktpPhoto}
            setKtpPhoto={setKtpPhoto}
            handleFileChange={handleFileChange}
          />
        );
      case 3:
        return (
          <PackageStep 
            formData={formData} 
            setFormData={setFormData}
            housePhoto={housePhoto}
            setHousePhoto={setHousePhoto}
            handleFileChange={handleFileChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Head>
        <title>Pendaftaran Pelanggan Baru - ISP Management</title>
        <meta name="description" content="Daftar sebagai pelanggan baru dengan GPS akurat" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Pendaftaran Pelanggan Baru
              </h1>
              <p className="text-gray-600">
                Lengkapi data berikut untuk mendaftar sebagai pelanggan
              </p>
            </div>

            <StepIndicator 
              currentStep={currentStep} 
              totalSteps={3} 
              stepTitles={stepTitles}
            />

            <form onSubmit={handleSubmit}>
              {renderCurrentStep()}

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Selanjutnya
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Mengirim...' : 'Daftar Sekarang'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerRegistration;
