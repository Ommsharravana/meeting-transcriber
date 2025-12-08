'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface SystemSettings {
  defaultTranscriptionModel?: string;
  maxAudioDuration?: number;
  allowUserRegistration?: boolean;
  maintenanceMode?: boolean;
  systemAnnouncement?: string;
}

export default function SystemSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (session?.user?.role !== 'superadmin') {
      router.push('/admin');
      return;
    }
    fetchSettings();
  }, [session, router]);

  async function fetchSettings() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/super/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveSetting(key: string, value: any) {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/super/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });

      if (res.ok) {
        setSettings((prev) => ({ ...prev, [key]: value }));
        setMessage({ type: 'success', text: 'Setting saved successfully' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save setting' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save setting' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  function handleChange(key: string, value: any) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-gray-400 mt-1">Configure global application settings</p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
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

      {loading ? (
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-800/50 rounded-xl p-6 animate-pulse"
            >
              <div className="h-5 bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="h-10 bg-gray-700 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Transcription Settings */}
          <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              Transcription Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Default Transcription Model
                </label>
                <div className="flex gap-2">
                  <select
                    value={settings.defaultTranscriptionModel || 'whisper-1'}
                    onChange={(e) => handleChange('defaultTranscriptionModel', e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="whisper-1">OpenAI Whisper</option>
                    <option value="elevenlabs">ElevenLabs Scribe</option>
                  </select>
                  <button
                    onClick={() => saveSetting('defaultTranscriptionModel', settings.defaultTranscriptionModel || 'whisper-1')}
                    disabled={saving}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Max Audio Duration (minutes)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={settings.maxAudioDuration || 120}
                    onChange={(e) => handleChange('maxAudioDuration', parseInt(e.target.value))}
                    min={1}
                    max={480}
                    className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => saveSetting('maxAudioDuration', settings.maxAudioDuration || 120)}
                    disabled={saving}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Settings */}
          <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Registration Settings</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Allow User Registration</p>
                  <p className="text-sm text-gray-400">Enable new users to sign up for accounts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allowUserRegistration !== false}
                    onChange={(e) => {
                      handleChange('allowUserRegistration', e.target.checked);
                      saveSetting('allowUserRegistration', e.target.checked);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Maintenance Mode */}
          <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Maintenance Mode</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Enable Maintenance Mode</p>
                  <p className="text-sm text-gray-400">
                    Prevent non-admin users from accessing the application
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode === true}
                    onChange={(e) => {
                      handleChange('maintenanceMode', e.target.checked);
                      saveSetting('maintenanceMode', e.target.checked);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* System Announcement */}
          <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">System Announcement</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Announcement Message (shown to all users)
                </label>
                <div className="flex gap-2">
                  <textarea
                    value={settings.systemAnnouncement || ''}
                    onChange={(e) => handleChange('systemAnnouncement', e.target.value)}
                    placeholder="Enter an optional system-wide announcement..."
                    rows={3}
                    className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => saveSetting('systemAnnouncement', settings.systemAnnouncement || '')}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    Save Announcement
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
