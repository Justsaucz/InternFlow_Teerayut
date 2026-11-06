import { useEffect, useState, useRef } from 'react';
import { Book, Award, Sparkles, User, Mail, GraduationCap, Edit3, X, Check, Camera } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useLanguage } from '../../context/LanguageContext';

interface StudentProfile {
  id: string;
  studentId: string;
  major: string;
  faculty: string;
  university?: string | null;
  year: number;
  gpa: number | null;
  skills: string[];
  bio: string | null;
  avatarUrl?: string | null;
  user: { id: string; name: string; email: string; avatarUrl?: string | null };
}

export default function StudentProfile() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const { success, error: showError } = useToast();
  const { t, language } = useLanguage();
  
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    major: '',
    faculty: '',
    university: '',
    year: 1,
    gpa: '',
    bio: '',
    skills: '', // comma separated
    avatarUrl: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const profileRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/student/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
        setFormData({
          name: data.user?.name || '',
          studentId: data.studentId || '',
          major: data.major || '',
          faculty: data.faculty || '',
          university: data.university || '',
          year: data.year || 1,
          gpa: data.gpa ? data.gpa.toString() : '',
          bio: data.bio || '',
          skills: data.skills ? data.skills.join(', ') : '',
          avatarUrl: data.avatarUrl || data.user?.avatarUrl || ''
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Image file size must be less than 5MB');
      return;
    }

    // Instant local preview
    const previewUrl = URL.createObjectURL(file);
    setLocalAvatarPreview(previewUrl);

    setUploadingAvatar(true);
    try {
      const token = localStorage.getItem('token');
      const data = new FormData();
      data.append('file', file);
      data.append('type', 'AVATAR');

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: data
      });

      if (res.ok) {
        const result = await res.json();
        const uploadedUrl = result.fileUrl || result.url;
        setFormData(prev => ({ ...prev, avatarUrl: uploadedUrl }));
        success('Profile photo uploaded! Click "Save Changes" to apply.');
      } else {
        const err = await res.json();
        showError(err.error || 'Failed to upload photo');
      }
    } catch (error) {
      showError('Error uploading photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        year: parseInt(formData.year.toString()),
        gpa: formData.gpa ? parseFloat(formData.gpa) : null,
        skills: formData.skills.split(',').map(s => s.trim()).filter(s => s)
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/student/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        success('Profile updated successfully!');
        // Update user in localStorage
        const localUser = localStorage.getItem('user');
        if (localUser) {
          const parsed = JSON.parse(localUser);
          if (formData.name) parsed.name = formData.name;
          if (formData.avatarUrl) parsed.avatarUrl = formData.avatarUrl;
          localStorage.setItem('user', JSON.stringify(parsed));
        }
        setLocalAvatarPreview(null);
        setEditing(false);
        fetchProfile();
      } else {
        showError('Failed to update profile. Please try again.');
      }
    } catch (error) {
      showError('Network error. Please try again.');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }
  
  if (!profile) return <div className="text-center py-12 text-gray-500">Profile not found</div>;

  const currentAvatar = localAvatarPreview || (editing ? formData.avatarUrl : (profile.avatarUrl || profile.user.avatarUrl));

  return (
    <div className="workspace-page workspace-profile max-w-4xl mx-auto space-y-6">
      {/* Hidden File Input for Avatar */}
      <input 
        type="file" 
        ref={avatarInputRef} 
        onChange={handleAvatarFileChange} 
        accept="image/png,image/jpeg,image/jpg,image/webp" 
        className="hidden" 
      />

      {/* Page Title & Action */}
      <div className="workspace-page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight font-heading">{t.profile.title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t.profile.subtitle}</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-xs cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-emerald-600" />
            {t.common.edit}
          </button>
        ) : (
          <button
            onClick={() => {
              setEditing(false);
              setLocalAvatarPreview(null);
              fetchProfile();
            }}
            className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
            {t.common.cancel}
          </button>
        )}
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Banner with Gradient Accent */}
        <div className="h-36 sm:h-44 bg-gradient-to-r from-sky-600 via-primary-600 to-indigo-700 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-60"></div>
          <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>

          {/* Avatar Badge positioned cleanly over bottom edge */}
          <div className="absolute left-6 sm:left-8 -bottom-12 z-10">
            <div className="relative group">
              <div 
                onClick={() => {
                  if (editing) avatarInputRef.current?.click();
                }}
                className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1 shadow-xl border-4 border-white overflow-hidden relative ${editing ? 'cursor-pointer hover:border-primary-200' : ''} transition-all`}
              >
                {currentAvatar ? (
                  <img 
                    src={currentAvatar.startsWith('blob:') || currentAvatar.startsWith('http') ? currentAvatar : `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${currentAvatar}`} 
                    alt={profile.user.name} 
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-black shadow-inner">
                    {profile.user.name ? profile.user.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                )}

                {/* Subtle Hover Overlay during editing */}
                {editing && !uploadingAvatar && (
                  <div className="absolute inset-0 rounded-xl bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-center p-1">
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] font-bold">Change</span>
                  </div>
                )}

                {/* Uploading Spinner */}
                {uploadingAvatar && (
                  <div className="absolute inset-0 rounded-xl bg-slate-950/70 flex flex-col items-center justify-center text-white">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mb-1"></div>
                    <span className="text-[9px] font-bold">Uploading...</span>
                  </div>
                )}
              </div>

              {/* Corner Camera Action Button */}
              {editing && (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1.5 -right-1.5 bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-xl shadow-lg border-2 border-white cursor-pointer hover:scale-110 active:scale-95 transition-all z-20"
                  title="Upload profile photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Info Header */}
        <div className="px-6 sm:px-8 pt-16 sm:pt-4 pb-6 border-b border-gray-100 sm:pl-44">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                  {editing ? formData.name || profile.user.name : profile.user.name}
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200">
                  Student
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {profile.user.email}
                </span>
                <span className="text-gray-300 hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-primary-700 bg-primary-50/60 px-2.5 py-0.5 rounded-lg border border-primary-100">
                  <GraduationCap className="w-4 h-4 text-primary-600" />
                  {profile.university ? `${profile.university} • ` : ''}Year {profile.year || 1} • {profile.major || 'Student'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Body: Form or Overview */}
        <div className="p-6 sm:p-8">
          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
                    placeholder="Your Full Name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
                    placeholder="e.g. 64010123"
                    value={formData.studentId}
                    onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                    required
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">University / Academic Institution</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
                    placeholder="e.g. Thammasat University (SIIT), Chulalongkorn University"
                    value={formData.university}
                    onChange={e => setFormData({ ...formData, university: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Faculty</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
                    placeholder="e.g. Engineering, Science"
                    value={formData.faculty}
                    onChange={e => setFormData({ ...formData, faculty: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Major / Program</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
                    placeholder="e.g. Computer Science"
                    value={formData.major}
                    onChange={e => setFormData({ ...formData, major: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year of Study</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GPA (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.00"
                    placeholder="e.g. 3.50"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
                    value={formData.gpa}
                    onChange={e => setFormData({ ...formData, gpa: e.target.value })}
                  />
                </div>
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skills (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. React, TypeScript, Node.js, PostgreSQL, UI/UX Design"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
                    value={formData.skills}
                    onChange={e => setFormData({ ...formData, skills: e.target.value })}
                  />
                </div>
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio / About Me</label>
                  <textarea
                    rows={4}
                    placeholder="Tell recruiters about your interests, key achievements, and what kind of internship you are looking for..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all resize-none"
                    value={formData.bio}
                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all cursor-pointer"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {t.common.save}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Academic Info */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h4 className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                    <Book className="w-4 h-4 mr-1.5 text-primary-500" /> Academic Details
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 sm:col-span-2">
                      <span className="text-xs text-gray-500 font-medium">University / Academic Institution</span>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{profile.university || 'Not specified'}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                      <span className="text-xs text-gray-500 font-medium">Faculty</span>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{profile.faculty || 'Not specified'}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                      <span className="text-xs text-gray-500 font-medium">Major</span>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{profile.major || 'Not specified'}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                      <span className="text-xs text-gray-500 font-medium">Student ID</span>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{profile.studentId || 'Not specified'}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                      <span className="text-xs text-gray-500 font-medium">Current Year</span>
                      <p className="text-sm font-semibold text-gray-900 mt-1">Year {profile.year || '1'}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-gray-500 font-medium">Cumulative GPA</span>
                          <p className="text-lg font-bold text-primary-600 mt-0.5">
                            {profile.gpa ? Number(profile.gpa).toFixed(2) : 'N/A'}
                          </p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">
                          Good Standing
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio Section */}
                <div>
                  <h4 className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    <User className="w-4 h-4 mr-1.5 text-primary-500" /> About Me
                  </h4>
                  <div className="p-5 rounded-2xl bg-gray-50/60 border border-gray-100 text-sm text-gray-700 leading-relaxed">
                    {profile.bio ? (
                      profile.bio
                    ) : (
                      <span className="text-gray-400 italic">No biography provided. Click "Edit Profile" to tell employers about yourself.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Skills & Highlights */}
              <div className="space-y-6">
                <div>
                  <h4 className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                    <Sparkles className="w-4 h-4 mr-1.5 text-primary-500" /> Skills & Expertise
                  </h4>

                  <div className="p-5 rounded-2xl bg-gray-50/60 border border-gray-100">
                    <div className="flex flex-wrap gap-2">
                      {profile.skills && profile.skills.length > 0 ? (
                        profile.skills.map((skill, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-white text-gray-800 border border-gray-200 shadow-2xs hover:border-primary-300 hover:text-primary-600 transition-colors"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs italic">No skills listed yet.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Tip Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-primary-50 to-indigo-50/50 border border-primary-100/60 text-primary-950">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-primary-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary-700">Internship Tip</span>
                  </div>
                  <p className="text-xs text-primary-800/80 leading-relaxed">
                    {language === 'th' ? 'เพิ่มสาขาวิชา ข้อมูลการศึกษา และทักษะ เพื่อให้บริษัทพิจารณาคุณสมบัติได้ครบถ้วน ข้อมูลผลการเรียนยังเป็นข้อมูลที่คุณระบุ' : 'Add your major, academic details, and skills to help employers review your qualifications. Academic details are currently self-reported.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

