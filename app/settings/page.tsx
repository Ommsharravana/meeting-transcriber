'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Key,
  Eye,
  EyeOff,
  Save,
  Trash2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Lock,
} from 'lucide-react';

interface ApiKeyInfo {
  provider: string;
  hasKey: boolean;
  keyHint: string | null;
}

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();

  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [newOpenAiKey, setNewOpenAiKey] = useState('');
  const [newElevenLabsKey, setNewElevenLabsKey] = useState('');
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [showElevenLabsKey, setShowElevenLabsKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      fetchApiKeys();
    }
  }, [session]);

  async function fetchApiKeys() {
    try {
      const res = await fetch('/api/user/api-keys');
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving('profile');

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        await updateSession();
        showMessage('success', 'Profile updated successfully');
      } else {
        const data = await res.json();
        showMessage('error', data.error || 'Failed to update profile');
      }
    } catch (error) {
      showMessage('error', 'Failed to update profile');
    } finally {
      setSaving(null);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      showMessage('error', 'Password must be at least 8 characters');
      return;
    }

    setSaving('password');

    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showMessage('success', 'Password changed successfully');
      } else {
        const data = await res.json();
        showMessage('error', data.error || 'Failed to change password');
      }
    } catch (error) {
      showMessage('error', 'Failed to change password');
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveApiKey(provider: 'openai' | 'elevenlabs') {
    const key = provider === 'openai' ? newOpenAiKey : newElevenLabsKey;

    if (!key.trim()) {
      showMessage('error', 'Please enter an API key');
      return;
    }

    setSaving(provider);

    try {
      const res = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: key }),
      });

      if (res.ok) {
        if (provider === 'openai') {
          setNewOpenAiKey('');
        } else {
          setNewElevenLabsKey('');
        }
        fetchApiKeys();
        showMessage('success', `${provider === 'openai' ? 'OpenAI' : 'ElevenLabs'} API key saved`);
      } else {
        const data = await res.json();
        showMessage('error', data.error || 'Failed to save API key');
      }
    } catch (error) {
      showMessage('error', 'Failed to save API key');
    } finally {
      setSaving(null);
    }
  }

  async function handleDeleteApiKey(provider: 'openai' | 'elevenlabs') {
    if (!confirm(`Are you sure you want to delete your ${provider === 'openai' ? 'OpenAI' : 'ElevenLabs'} API key?`)) {
      return;
    }

    setSaving(provider);

    try {
      const res = await fetch(`/api/user/api-keys?provider=${provider}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchApiKeys();
        showMessage('success', 'API key deleted');
      } else {
        const data = await res.json();
        showMessage('error', data.error || 'Failed to delete API key');
      }
    } catch (error) {
      showMessage('error', 'Failed to delete API key');
    } finally {
      setSaving(null);
    }
  }

  const getKeyInfo = (provider: string) => {
    return apiKeys.find((k) => k.provider === provider);
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </Link>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">Manage your account and API keys</p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            Profile
          </h2>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Email
              </label>
              <input
                type="email"
                value={session.user?.email || ''}
                disabled
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving === 'profile'}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving === 'profile' ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Password Section */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            Change Password
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving === 'password'}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {saving === 'password' ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* API Keys Section */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-cyan-400" />
            API Keys
          </h2>

          <p className="text-gray-400 text-sm mb-6">
            Your API keys are securely encrypted and stored. They are never shared with anyone.
          </p>

          {loading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
                  <div className="h-10 bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* OpenAI API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  OpenAI API Key
                </label>
                {getKeyInfo('openai')?.hasKey ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-400">
                      ••••••••{getKeyInfo('openai')?.keyHint}
                    </div>
                    <button
                      onClick={() => handleDeleteApiKey('openai')}
                      disabled={saving === 'openai'}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={showOpenAiKey ? 'text' : 'password'}
                        value={newOpenAiKey}
                        onChange={(e) => setNewOpenAiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full px-4 py-2 pr-10 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showOpenAiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={() => handleSaveApiKey('openai')}
                      disabled={saving === 'openai' || !newOpenAiKey.trim()}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Required for transcription and AI features
                </p>
              </div>

              {/* ElevenLabs API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  ElevenLabs API Key (Optional)
                </label>
                {getKeyInfo('elevenlabs')?.hasKey ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-400">
                      ••••••••{getKeyInfo('elevenlabs')?.keyHint}
                    </div>
                    <button
                      onClick={() => handleDeleteApiKey('elevenlabs')}
                      disabled={saving === 'elevenlabs'}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={showElevenLabsKey ? 'text' : 'password'}
                        value={newElevenLabsKey}
                        onChange={(e) => setNewElevenLabsKey(e.target.value)}
                        placeholder="Enter your ElevenLabs API key"
                        className="w-full px-4 py-2 pr-10 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowElevenLabsKey(!showElevenLabsKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showElevenLabsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={() => handleSaveApiKey('elevenlabs')}
                      disabled={saving === 'elevenlabs' || !newElevenLabsKey.trim()}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Alternative transcription provider
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
