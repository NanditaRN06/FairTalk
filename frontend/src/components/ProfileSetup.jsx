import { useState } from 'react';
import questionsData from '../utils/questions.json';

const ProfileSetup = ({ onProfileComplete }) => {
    const { questions: QUESTIONS, introText: INTRO_TEXT } = questionsData;

    const [step, setStep] = useState(1);
    const [answers, setAnswers] = useState({});
    const [formData, setFormData] = useState({ nickname: '', bio: '', genderPreference: 'any' });
    const [error, setError] = useState('');

    const handleOptionSelect = (qId, optionId) => {
        setAnswers(prev => ({ ...prev, [qId]: optionId }));
    };

    const isQuestionsComplete = QUESTIONS.every(q => answers[q.id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setError('');
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const nickname = formData.nickname.trim();

        if (!nickname || nickname.length < 3 || nickname.length > 20) {
            setError('Nickname must be between 3 and 20 characters.');
            return;
        }

        if (!formData.bio || formData.bio.trim().length <= 5) {
            setError('Bio is required and must be more than 5 letters.');
            return;
        }

        if (formData.bio.length > 120) {
            setError('Bio must be under 120 characters.');
            return;
        }

        try {
            const res = await fetch(`http://localhost:9000/api/user/check-nickname?nickname=${encodeURIComponent(nickname)}`);
            const data = await res.json();

            if (data.taken) {
                setError(data.message || 'This nickname is already in use in the active queue.');
                return;
            }
        } catch (err) {
            console.error('Nickname collision check failed:', err);
        }

        onProfileComplete({
            nickname,
            bio: formData.bio.trim(),
            genderPreference: formData.genderPreference,
            personalityAnswers: answers
        });
    };

    const BackgroundBlobs = () => (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-brand-primary/10 rounded-full blur-[100px] animate-blob"></div>
            <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-brand-accent/10 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
        </div>
    );

    if (step === 1) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 relative">
                <BackgroundBlobs />
                <div className="w-full max-w-xl glass-card rounded-[3rem] p-10 sm:p-12 text-center relative z-10 animate-fade-in shadow-2xl">
                    <div className="w-20 h-20 bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl rotate-12 animate-float">
                        <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 13.4876 3.36033 14.8911 4 16.1247L3 21L7.87531 20C9.10887 20.6397 10.5124 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8 9H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8 13H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    <h2 className="text-4xl font-heading font-extrabold text-white mb-6 leading-tight">
                        Fresh Start
                    </h2>

                    <p className="text-slate-400 font-medium mb-10 text-lg uppercase tracking-widest text-sm">
                        Guidelines & Vibes
                    </p>

                    <div className="bg-surface-darkest/40 backdrop-blur-md p-8 rounded-3xl mb-12 text-slate-300 text-[15px] leading-relaxed whitespace-pre-line text-left border border-white/5 shadow-inner max-h-[40vh] overflow-y-auto custom-scrollbar">
                        {INTRO_TEXT}
                    </div>

                    <button
                        onClick={() => setStep(2)}
                        className="btn-primary w-full py-4 text-lg"
                    >
                        I'm In, Let's Vibe
                    </button>
                </div>
            </div>
        );
    }

    if (step === 2) {
        const answeredCount = Object.keys(answers).length;
        const progress = (answeredCount / QUESTIONS.length) * 100;

        return (
            <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
                <BackgroundBlobs />
                <div className="w-full max-w-3xl glass-card rounded-[3rem] p-8 sm:p-12 relative z-10 animate-fade-in">

                    <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                        <div className="text-center md:text-left">
                            <h2 className="text-3xl font-heading font-extrabold text-white mb-2 leading-tight">
                                Your Rhythm
                            </h2>
                            <p className="text-slate-400 font-medium">Just vibes. No right or wrong.</p>
                        </div>

                        <div className="relative group">
                            <svg className="w-20 h-20 transform -rotate-90">
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="36"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="transparent"
                                    className="text-white/5"
                                />
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="36"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="transparent"
                                    strokeDasharray={2 * Math.PI * 36}
                                    strokeDashoffset={2 * Math.PI * 36 * (1 - progress / 100)}
                                    strokeLinecap="round"
                                    className="text-brand-primary transition-all duration-700 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-bold text-white tracking-tighter">
                                    {answeredCount}/{QUESTIONS.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8 max-h-[55vh] overflow-y-auto pr-4 custom-scrollbar mb-10 py-2">
                        {QUESTIONS.map((q, index) => (
                            <div
                                key={q.id}
                                className="group/q"
                            >
                                <div className="flex items-center gap-4 mb-5">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${answers[q.id] ? 'bg-vibrant-emerald text-white shadow-lg' : 'bg-white/5 text-slate-500 border border-white/10'}`}>
                                        {index + 1}
                                    </div>
                                    <p className="text-slate-200 font-bold text-lg leading-tight group-hover/q:text-white transition-colors">
                                        {q.text}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-0 md:ml-14">
                                    {q.options.map((opt) => {
                                        const isSelected = answers[q.id] === opt.id;

                                        return (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleOptionSelect(q.id, opt.id)}
                                                className={`relative px-6 py-4 rounded-3xl text-sm font-bold text-left border transition-all duration-300 ring-0 hover:ring-2 hover:ring-white/10
                                                ${isSelected
                                                        ? 'bg-gradient-to-br from-brand-primary to-brand-secondary border-transparent text-white shadow-xl shadow-brand-primary/20 scale-[1.03] translate-x-1'
                                                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                                                    }`}
                                            >
                                                <span className="relative z-10">{opt.text}</span>
                                                {isSelected && (
                                                    <span className="absolute top-1/2 -translate-y-1/2 right-4 text-lg">
                                                        ✨
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 border-t border-white/5">
                        <button
                            onClick={() => setStep(3)}
                            disabled={!isQuestionsComplete}
                            className={`w-full py-4 text-lg font-bold rounded-[2rem] transition-all duration-300 transform
                            ${isQuestionsComplete
                                    ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-2xl shadow-brand-primary/30 hover:scale-[1.02] active:scale-[0.98]'
                                    : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5 opacity-50'
                                }`}
                        >
                            {isQuestionsComplete ? 'Step Closer' : 'Find Your Vibes'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            <BackgroundBlobs />
            <div className="w-full max-w-md glass-card p-10 sm:p-12 rounded-[3.5rem] relative z-10 animate-fade-in shadow-2xl">

                <div className="text-center mb-10">
                    <div className="inline-block px-4 py-1.5 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-bold uppercase tracking-[0.2em] rounded-full mb-6">
                        Almost There
                    </div>
                    <h2 className="text-4xl font-heading font-extrabold text-white mb-3">
                        Who Are You?
                    </h2>
                    <p className="text-slate-400 font-medium">Session identity for this cycle.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">

                    <div className="group">
                        <label className="block text-slate-500 text-[10px] uppercase font-black tracking-widest mb-3 ml-2 group-focus-within:text-brand-primary transition-colors">
                            Nickname <span className="text-brand-accent">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                name="nickname"
                                value={formData.nickname}
                                onChange={handleInputChange}
                                className="w-full glass-input text-white rounded-3xl px-6 py-4 placeholder-slate-700 font-bold group-focus-within:ring-4 group-focus-within:ring-brand-primary/10 transition-all"
                                placeholder="ex: Orbit"
                                maxLength={20}
                                autoComplete="off"
                            />
                            <div className="absolute top-1/2 -translate-y-1/2 right-6">
                                <span className={`text-[10px] font-black ${formData.nickname.length >= 3 ? 'text-vibrant-emerald' : 'text-slate-600'}`}>
                                    {formData.nickname.length}/20
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-slate-500 text-[10px] uppercase font-black tracking-widest mb-3 ml-2 group-focus-within:text-brand-primary transition-colors">
                            Bio <span className="text-brand-accent">*</span>
                        </label>
                        <div className="relative">
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full glass-input text-white rounded-[2rem] px-6 py-5 placeholder-slate-700 font-medium resize-none group-focus-within:ring-4 group-focus-within:ring-brand-primary/10 transition-all text-sm leading-relaxed"
                                placeholder="Signal your frequency..."
                                maxLength={120}
                            />
                            <div className="absolute bottom-4 right-6 text-[10px] font-black text-slate-600">
                                {formData.bio.length}/120
                            </div>
                        </div>
                    </div>

                    <div className="group">
                        <label className="block text-slate-500 text-[10px] uppercase font-black tracking-widest mb-3 ml-2 group-focus-within:text-brand-primary transition-colors">
                            I want to talk to...
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {['any', 'male', 'female'].map((pref) => (
                                <button
                                    key={pref}
                                    type="button"
                                    onClick={() => setFormData(p => ({ ...p, genderPreference: pref }))}
                                    className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.genderPreference === pref
                                        ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20'
                                        : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
                                        }`}
                                >
                                    {pref === 'any' ? 'Everyone' : pref}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold text-center animate-shake">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary w-full py-5 text-xl relative group overflow-hidden"
                    >
                        <span className="relative z-10">Ignite Conversation</span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </button>

                    <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest font-black opacity-50">
                        Anonymous. Temporary. Secure.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default ProfileSetup;