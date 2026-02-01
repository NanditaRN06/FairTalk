import { useState, useRef, useEffect } from 'react';
import { getOrCreateDeviceId } from '../utils/identity';

const CameraVerification = ({ onVerificationComplete }) => {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [status, setStatus] = useState('IDLE'); // IDLE, PREVIEW, PROCESSING, ERROR
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        // Cleanup on unmount
        return () => stopCamera();
    }, []);

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

            // 1. Capture Frame to Canvas
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0);

            // 2. Stop Camera IMMEDIATELY (Privacy)
            stopCamera();

            // 3. Convert to Base64
            const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
            const deviceId = getOrCreateDeviceId();

            // 4. Send to Backend
            const response = await fetch('http://localhost:9000/api/verify', {
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
            stopCamera(); // Ensure stopped if it failed mid-way
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-700 text-center">

                <h2 className="text-xl font-bold text-white mb-4">Identity Verification</h2>

                {/* Video Area */}
                <div className="relative w-full aspect-[4/3] bg-black rounded-lg overflow-hidden mb-6 border border-gray-600 flex items-center justify-center">
                    {status === 'IDLE' && (
                        <p className="text-gray-500 text-sm">Camera Offline</p>
                    )}
                    {status === 'ERROR' && (
                        <div className="p-4 text-red-400 text-sm">
                            {errorMsg}
                        </div>
                    )}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${status === 'PREVIEW' ? 'block' : 'hidden'}`}
                    />
                    {status === 'PROCESSING' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="space-y-3">
                    {status === 'IDLE' || status === 'ERROR' ? (
                        <button
                            onClick={startCamera}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                        >
                            {status === 'ERROR' ? 'Retry Camera' : 'Enable Camera'}
                        </button>
                    ) : null}

                    {status === 'PREVIEW' && (
                        <button
                            onClick={handleVerify}
                            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition shadow-lg shadow-green-900/50"
                        >
                            Verify Me
                        </button>
                    )}

                    <p className="text-xs text-gray-500 mt-4">
                        We capture one frame only. <br /> Image is never stored.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CameraVerification;
