'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, signOut, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-4xl font-extrabold text-gray-900">
            DropIn FC
          </h1>
        </div>

        {user ? (
          <div className="mt-8 space-y-6">
            <div className="text-center">
              <p className="text-lg text-gray-700">Welcome back!</p>
              <p className="mt-2 text-sm text-gray-600">{user.email}</p>
            </div>
            <button
              onClick={signOut}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="text-center">
              <p className="text-lg text-gray-700">
                Please sign in to continue
              </p>
            </div>
            <div className="space-y-3">
              <Link
                href="/login"
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create account
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
