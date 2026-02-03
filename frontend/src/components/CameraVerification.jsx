import { useState, useRef, useEffect } from 'react';
import { getOrCreateDeviceId } from '../utils/identity';

const CameraVerification = ({ onVerificationComplete }) => {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [status, setStatus] = useState('IDLE'); // IDLE, PREVIEW, PROCESSING, ERROR
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => { return () => stopCamera(); }, []);

    const startCamera = async () => {
        try {
            setStatus('PREVIEW');
            setErrorMsg('');
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera Error:", err);
            setStatus('ERROR');
            setErrorMsg('Camera permission denied or not available.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            if (videoRef.current) videoRef.current.srcObject = null;
        }
    };

    const handleVerify = async () => {
        if (!videoRef.current) return;

        try {
            setStatus('PROCESSING');

            const MAX_WIDTH = 640;
            const videoWidth = videoRef.current.videoWidth;
            const videoHeight = videoRef.current.videoHeight;
            const scale = Math.min(1, MAX_WIDTH / videoWidth);

            const canvas = document.createElement('canvas');
            canvas.width = videoWidth * scale;
            canvas.height = videoHeight * scale;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

            stopCamera();

            const imageBase64 = canvas.toDataURL('image/jpeg', 0.6);
            const deviceId = getOrCreateDeviceId();
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:9000';
            const response = await fetch(`${apiUrl}/api/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageBase64, deviceId })
            });

            const result = await response.json();

            if (result.authorized) {
                onVerificationComplete(result);
            } else {
                setStatus('ERROR');
                setErrorMsg(result.message || 'Verification failed. Please try again.');
            }

        } catch (err) {
            console.error("Verification Error:", err);
            setStatus('ERROR');
            setErrorMsg('Network error. Is the backend running?');
            stopCamera();
        }
    };

    return (
        <div className="fixed inset-0 bg-surface-darkest/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
            {/* Animated background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-primary/20 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-brand-accent/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
            </div>

            <div className="glass-card p-8 rounded-[2.5rem] max-w-sm w-full relative z-10 text-center">
                <div className="mb-8">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20 rotate-3 animate-float relative">
                            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 13.4876 3.36033 14.8911 4 16.1247L3 21L7.87531 20C9.10887 20.6397 10.5124 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M8 9H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M8 13H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-vibrant-rose rounded-full animate-ping opacity-75"></div>
                        </div>
                    </div>
                    <h2 className="text-3xl font-heading font-bold text-white mb-2 leading-tight">Fast Pass</h2>
                    <p className="text-slate-400 text-sm font-medium">Verify your human vibes to enter.</p>
                </div>

                <div className="relative w-full aspect-square bg-surface-darkest/50 rounded-3xl overflow-hidden mb-8 border border-white/5 ring-1 ring-white/10 flex items-center justify-center group shadow-inner">
                    {status === 'IDLE' && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-all duration-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                        </div>
                    )}

                    {status === 'ERROR' && (
                        <div className="px-6 py-4 flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <p className="text-rose-400 text-xs font-semibold leading-relaxed">
                                {errorMsg}
                            </p>
                        </div>
                    )}

                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover grayscale brightness-110 contrast-125 ${status === 'PREVIEW' ? 'block animate-fade-in' : 'hidden'}`}
                    />

                    {status === 'PROCESSING' && (
                        <div className="absolute inset-0 bg-brand-primary/20 backdrop-blur-sm flex items-center justify-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/20 blur-xl animate-pulse rounded-full"></div>
                                <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white relative z-10"></div>
                            </div>
                        </div>
                    )}

                    {/* Scanner line animation for processing */}
                    {status === 'PREVIEW' && (
                        <div className="absolute w-full h-0.5 bg-brand-primary shadow-[0_0_10px_#6366f1] top-0 left-0 animate-[shimmer_3s_linear_infinite]"></div>
                    )}
                </div>

                <div className="space-y-4">
                    {status === 'IDLE' || status === 'ERROR' ? (
                        <button
                            onClick={startCamera}
                            className="btn-primary w-full group overflow-hidden relative"
                        >
                            <span className="relative z-10">{status === 'ERROR' ? 'Try Again' : 'Unlock Camera'}</span>
                        </button>
                    ) : null}

                    {status === 'PREVIEW' && (
                        <button
                            onClick={handleVerify}
                            className="w-full py-4 bg-white text-surface-darkest font-bold rounded-2xl shadow-xl hover:bg-slate-100 transition duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Snap & Verify
                        </button>
                    )}

                    <div className="flex items-center justify-center gap-2 pt-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="text-[11px] text-slate-500 font-medium">
                            Private. Not stored. Always secure.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CameraVerification;