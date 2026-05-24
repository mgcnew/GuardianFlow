import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

export function UserProfile() {
    const { user, profile, refreshProfile } = useAuth();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [nickname, setNickname] = useState((profile as any)?.nickname || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [photoUrl, setPhotoUrl] = useState<string | null>((profile as any)?.avatar_url || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const userEmail = user?.email || '';
    const userInitial = (fullName || userEmail.split('@')[0] || 'U').charAt(0).toUpperCase();
    const displayRole = profile?.role
        ? {
            saas_admin: 'Super Admin',
            org_admin: 'Administrador',
            admin: 'Administrador',
            pedagogue: 'Pedagogo(a)',
            technician: 'Técnico(a)',
            technical: 'Técnico(a)',
            educator: 'Educador(a)',
            operational: 'Operacional',
        }[profile.role] || profile.role
        : 'Membro';

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `avatar_${Date.now()}.${fileExt}`;
        const path = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, file, { upsert: true });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            toast('Erro ao subir foto: ' + uploadError.message, 'error');
        } else {
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(path);

            const newPhotoUrl = urlData.publicUrl;
            setPhotoUrl(newPhotoUrl);

            // Update profile with the new URL
            await supabase
                .from('profiles')
                .update({ avatar_url: newPhotoUrl })
                .eq('id', user.id);

            await refreshProfile();
        }
        setUploading(false);
    };

    const handleRemovePhoto = async () => {
        if (!user) return;
        setUploading(true);

        const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: null })
            .eq('id', user.id);

        if (!error) {
            setPhotoUrl(null);
            await refreshProfile();
        }
        setUploading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        setSaved(false);

        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: fullName || null,
                nickname: nickname || null,
                phone: phone || null,
            })
            .eq('id', user.id);

        setSaving(false);
        if (error) {
            toast('Erro ao salvar: ' + error.message, 'error');
        } else {
            setSaved(true);
            toast('Perfil salvo com sucesso!', 'success');
            await refreshProfile();
            setTimeout(() => setSaved(false), 3000);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold text-text-main dark:text-white tracking-tight">Meu Perfil</h1>
                <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-1">
                    Gerencie suas informações pessoais e preferências.
                </p>
            </div>

            {/* Profile Card */}
            <div className="rounded-2xl bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 overflow-hidden">
                {/* Profile header */}
                <div className="px-6 py-8 border-b border-border-light dark:border-gray-800 flex flex-col sm:flex-row items-center gap-6">
                    {/* Avatar */}
                    <div className="relative group">
                        <div className="size-24 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-3xl font-extrabold overflow-hidden">
                            {photoUrl ? (
                                <img src={photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                userInitial
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                        >
                            {uploading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
                            )}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                        />
                    </div>

                    <div className="text-center sm:text-left flex-1">
                        <h2 className="text-xl font-extrabold text-text-main dark:text-white">
                            {fullName || userEmail.split('@')[0]}
                        </h2>
                        <p className="text-sm text-text-secondary dark:text-gray-400 font-medium mt-0.5">{userEmail}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                <span className="material-symbols-outlined text-sm">badge</span>
                                {displayRole}
                            </span>
                            {photoUrl && (
                                <button
                                    type="button"
                                    onClick={handleRemovePhoto}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                    Remover foto
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSave}>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-text-main dark:text-gray-200 mb-1.5">
                                Nome completo
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg">person</span>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Seu nome completo"
                                    className="block w-full rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 pl-11 pr-4 py-3 text-sm text-text-main dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-text-main dark:text-gray-200 mb-1.5">
                                Apelido
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg">edit_note</span>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder="Ex: Rick"
                                    className="block w-full rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 pl-11 pr-4 py-3 text-sm text-text-main dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-text-main dark:text-gray-200 mb-1.5">
                                Telefone
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg">call</span>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="(00) 00000-0000"
                                    className="block w-full rounded-xl border border-border-light dark:border-gray-700 bg-white dark:bg-gray-800 pl-11 pr-4 py-3 text-sm text-text-main dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-text-main dark:text-gray-200 mb-1.5">
                                E-mail
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg">mail</span>
                                <input
                                    type="email"
                                    value={userEmail}
                                    disabled
                                    className="block w-full rounded-xl border border-border-light dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 pl-11 pr-4 py-3 text-sm text-text-secondary dark:text-gray-500 font-medium cursor-not-allowed"
                                />
                            </div>
                            <p className="text-xs text-text-secondary dark:text-gray-500 mt-1.5">O e-mail não pode ser alterado.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-text-main dark:text-gray-200 mb-1.5">
                                Função
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg">work</span>
                                <input
                                    type="text"
                                    value={displayRole}
                                    disabled
                                    className="block w-full rounded-xl border border-border-light dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 pl-11 pr-4 py-3 text-sm text-text-secondary dark:text-gray-500 font-medium cursor-not-allowed"
                                />
                            </div>
                            <p className="text-xs text-text-secondary dark:text-gray-500 mt-1.5">A função é definida pelo administrador.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-text-main dark:text-gray-200 mb-1.5">
                                Organização
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-lg">corporate_fare</span>
                                <input
                                    type="text"
                                    value={profile?.organization_id ? `ID: ${profile.organization_id.substring(0, 8)}...` : 'Não vinculado'}
                                    disabled
                                    className="block w-full rounded-xl border border-border-light dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 pl-11 pr-4 py-3 text-sm text-text-secondary dark:text-gray-500 font-medium cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Save footer */}
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-border-light dark:border-gray-800 flex items-center justify-between">
                        <div>
                            {saved && (
                                <span className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                    Perfil atualizado com sucesso
                                </span>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="h-12 px-8 bg-primary text-white text-sm font-bold rounded-xl hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-sm font-display"
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">save</span>
                                    Salvar Alterações
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Security section */}
            <div className="rounded-2xl bg-white dark:bg-surface-dark border border-border-light dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-5 border-b border-border-light dark:border-gray-800 flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-lg">security</span>
                    </div>
                    <h2 className="text-base font-bold text-text-main dark:text-white">Segurança</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b border-border-light dark:border-gray-800">
                        <div>
                            <p className="text-sm font-semibold text-text-main dark:text-white">Alterar senha</p>
                            <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">Receba um e-mail para redefinir sua senha.</p>
                        </div>
                        <button
                            onClick={async () => {
                                if (userEmail) {
                                    await supabase.auth.resetPasswordForEmail(userEmail);
                                    toast('E-mail de redefinição enviado!', 'success');
                                }
                            }}
                            className="h-12 px-6 border border-border-light dark:border-gray-700 text-text-main dark:text-white text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-shrink-0 shadow-sm font-display"
                        >
                            Enviar e-mail
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3">
                        <div>
                            <p className="text-sm font-semibold text-text-main dark:text-white">Conta criada em</p>
                            <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                                {user?.created_at
                                    ? new Date(user.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                                    : 'Data indisponível'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
