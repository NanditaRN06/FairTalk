const EligibilityConfirmation = ({ onJoin, onLeave }) => {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background glowing aura */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-vibrant-emerald/10 rounded-full blur-[150px] animate-pulse-slow"></div>

            <div className="glass-card p-10 sm:p-14 rounded-[4rem] max-w-lg w-full relative z-10 text-center shadow-[0_32px_120px_rgba(0,0,0,0.5)] border-white/5">
                <div className="mb-10">
                    <div className="relative inline-block mb-10">
                        <div className="absolute inset-0 bg-vibrant-emerald blur-3xl opacity-30 animate-pulse"></div>
                        <div className="relative w-24 h-24 bg-gradient-to-br from-vibrant-emerald to-emerald-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-vibrant-emerald/40 -rotate-6 transform hover:rotate-0 transition-all duration-700 cursor-default">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        {/* Orbiting particles */}
                        <div className="absolute top-0 right-0 w-4 h-4 bg-vibrant-amber rounded-full animate-bounce [animation-delay:0.1s]"></div>
                        <div className="absolute bottom-4 -left-4 w-3 h-3 bg-vibrant-cyan rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>

                    <h2 className="text-5xl font-heading font-black text-white mb-6 tracking-tighter leading-tight italic">
                        SIGNAL ACQUIRED
                    </h2>
                    <p className="text-slate-400 font-bold text-lg uppercase tracking-[0.3em] mb-4">
                        Status: Eligible
                    </p>
                    <p className="text-slate-300 font-medium leading-relaxed max-w-sm mx-auto opacity-70">
                        The frequency is clear. Ready to connect with someone new in the space?
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-5">
                    <button
                        onClick={onLeave}
                        className="flex-1 py-5 px-8 rounded-3xl bg-white/5 text-slate-400 font-black uppercase tracking-widest text-xs border border-white/5 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-all duration-300"
                    >
                        Maybe Later
                    </button>
                    <button
                        onClick={onJoin}
                        className="btn-primary flex-1 py-5 px-8 rounded-3xl text-sm tracking-widest uppercase font-black shadow-[0_15px_35px_rgba(99,102,241,0.3)]"
                    >
                        Join The Space
                    </button>
                </div>

                <div className="mt-12 flex items-center justify-center gap-6 opacity-30 grayscale">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-500"></div>
                    <span className="text-[10px] font-black tracking-[0.5em] text-slate-500 uppercase">Live Queue Active</span>
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-500"></div>
                </div>
            </div>
        </div>
    );
};

export default EligibilityConfirmation;
