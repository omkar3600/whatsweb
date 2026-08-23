"use client";

import { useState } from 'react';
import { api } from '@/lib/api';
import { User, Phone, Store, Building, MapPin, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DemoPage() {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        businessName: '',
        businessType: '',
        city: '',
        state: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/demo', formData);
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit demo request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white font-sans py-12">
            {/* Background Animated Blobs */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-[#25D366] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>

            <div className="relative w-full max-w-xl px-6">
                {/* Logo & Header */}
                <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                    <Link href="/" className="inline-block">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#25D366]/10 shadow-lg shadow-[#25D366]/5 transition-transform hover:scale-105">
                            <img src="/whatshub-logo.png" alt="WhatsHub Logo" className="h-12 w-12 rounded-xl object-cover" />
                        </div>
                    </Link>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
                        Book a Demo
                    </h1>
                    <p className="mt-3 text-gray-500 font-medium">
                        See how WhatsHub can transform your business.
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl shadow-gray-200/50 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-6">
                                <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Received!</h2>
                            <p className="text-gray-500 mb-8">
                                Thank you for your interest. Our team will contact you shortly to schedule your personalized demo.
                            </p>
                            <Link href="/">
                                <button className="inline-flex items-center justify-center rounded-2xl bg-[#25D366] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#25D366]/20 hover:bg-[#20bd5a] transition-all">
                                    Return Home
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            {error && (
                                <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-600 animate-in shake duration-300">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Name */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-[#25D366] text-gray-400 transition-colors">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            placeholder="John Doe"
                                            className="block w-full rounded-2xl bg-gray-50 border border-gray-200 px-11 py-3.5 text-gray-900 placeholder-gray-400 focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#25D366]/10 transition-all text-sm"
                                            value={formData.name}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-[#25D366] text-gray-400 transition-colors">
                                            <Phone className="h-5 w-5" />
                                        </div>
                                        <input
                                            type="tel"
                                            name="phone"
                                            required
                                            placeholder="+1 234 567 8900"
                                            className="block w-full rounded-2xl bg-gray-50 border border-gray-200 px-11 py-3.5 text-gray-900 placeholder-gray-400 focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#25D366]/10 transition-all text-sm"
                                            value={formData.phone}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                {/* Business Name */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Business Name</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-[#25D366] text-gray-400 transition-colors">
                                            <Store className="h-5 w-5" />
                                        </div>
                                        <input
                                            type="text"
                                            name="businessName"
                                            required
                                            placeholder="Acme Corp"
                                            className="block w-full rounded-2xl bg-gray-50 border border-gray-200 px-11 py-3.5 text-gray-900 placeholder-gray-400 focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#25D366]/10 transition-all text-sm"
                                            value={formData.businessName}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                {/* Business Type */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Business Type</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-[#25D366] text-gray-400 transition-colors">
                                            <Building className="h-5 w-5" />
                                        </div>
                                        <select
                                            name="businessType"
                                            required
                                            className="block w-full rounded-2xl bg-gray-50 border border-gray-200 px-11 py-3.5 text-gray-900 focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#25D366]/10 transition-all text-sm appearance-none"
                                            value={formData.businessType}
                                            onChange={handleChange}
                                        >
                                            <option value="" disabled>Select Type</option>
                                            <option value="E-commerce">E-commerce</option>
                                            <option value="Retail">Retail</option>
                                            <option value="Agency">Agency</option>
                                            <option value="SaaS">SaaS</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                {/* City */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">City</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-[#25D366] text-gray-400 transition-colors">
                                            <MapPin className="h-5 w-5" />
                                        </div>
                                        <input
                                            type="text"
                                            name="city"
                                            required
                                            placeholder="San Francisco"
                                            className="block w-full rounded-2xl bg-gray-50 border border-gray-200 px-11 py-3.5 text-gray-900 placeholder-gray-400 focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#25D366]/10 transition-all text-sm"
                                            value={formData.city}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                {/* State */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">State</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-[#25D366] text-gray-400 transition-colors">
                                            <MapPin className="h-5 w-5" />
                                        </div>
                                        <input
                                            type="text"
                                            name="state"
                                            required
                                            placeholder="CA"
                                            className="block w-full rounded-2xl bg-gray-50 border border-gray-200 px-11 py-3.5 text-gray-900 placeholder-gray-400 focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#25D366]/10 transition-all text-sm"
                                            value={formData.state}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative flex w-full items-center justify-center rounded-2xl bg-[#25D366] px-4 py-4 text-sm font-bold text-white shadow-lg shadow-[#25D366]/20 hover:bg-[#20bd5a] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 transition-all active:scale-[0.98]"
                                >
                                    {loading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            Submit Request
                                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Security Footer */}
                <p className="mt-10 text-center text-xs text-gray-400 font-medium">
                    &copy; 2024 WhatsHub Messaging. Secure & Encrypted Connection.
                </p>
            </div>
        </div>
    );
}
