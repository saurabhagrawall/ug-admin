'use client';

import { useForm } from 'react-hook-form';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

type Form = { email: string; password: string };

export default function LoginPage() {
  const { register, handleSubmit } = useForm<Form>();
  const [error, setError] = useState('');
  const router = useRouter();

  const onSubmit = async ({ email, password }: Form) => {
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success('Welcome back!');
      router.replace('/students');
    } catch (e: any) {
      const msg = e?.message ?? 'Login failed';
      setError(msg);
      toast.error('Login failed');
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border p-6 bg-white shadow-sm">
        <h1 className="text-xl font-semibold mb-2">Sign in</h1>
        <p className="text-sm text-gray-600 mb-6">Use the admin account you created in Firebase.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@example.com"
              {...register('email', { required: true })}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              {...register('password', { required: true })}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 hover:bg-blue-700 text-white py-2.5 font-medium"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
