"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers';
import { api } from '@/lib/api';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && user) {
            const role = user.role?.toLowerCase() || 'user';
            const target = role === 'admin' ? '/admin/shops' : '/dashboard';
            router.replace(target);
        }
    }, [user, authLoading, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/login', { username, password });
            login(res.data.user, res.data.access_token);
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Invalid username or password';
            setError(Array.isArray(msg) ? msg.join(', ') : msg);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || user) {
        return (
            <div className="relative flex min-h-screen items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-[#25D366]" />
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white font-sans">
            {/* Background Animated Blobs */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-[#25D366] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>

            <div className="relative w-full max-w-md px-6">
                {/* Logo & Header */}
                <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#25D366]/10 shadow-lg shadow-[#25D366]/5">
                        <img src="/whatsweb-logo.png" alt="WhatsWeb Logo" className="h-12 w-12 rounded-xl object-cover" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
                        Welcome Back
                    </h1>
                    <p className="mt-3 text-gray-500 font-medium">
                        Log into WhatsWeb Account
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl shadow-gray-200/50 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    <form className="space-y-5" onSubmit={handleLogin}>
                        {error && (
                            <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-600 animate-in shake duration-300">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Username</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-[#25D366] text-gray-400 transition-colors">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        placeholder="your_username"
                                        className="block w-full rounded-2xl bg-gray-50 border border-gray-200 px-11 py-3.5 text-gray-900 placeholder-gray-400 focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#25D366]/10 transition-all text-sm"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-[#25D366] text-gray-400 transition-colors">
                                        <Lock className="h-5 w-5" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        className="block w-full rounded-2xl bg-gray-50 border border-gray-200 px-11 py-3.5 text-gray-900 placeholder-gray-400 focus:border-[#25D366] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#25D366]/10 transition-all text-sm"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative flex w-full items-center justify-center rounded-2xl bg-[#25D366] px-4 py-4 text-sm font-bold text-white shadow-lg shadow-[#25D366]/20 hover:bg-[#20bd5a] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 transition-all active:scale-[0.98]"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>


                </div>

                {/* Security Footer */}
                <p className="mt-10 text-center text-xs text-gray-400 font-medium">
                    &copy; 2024 WhatsWeb Messaging. Secure & Encrypted Connection.
                </p>
            </div>
        </div>
    );
}
