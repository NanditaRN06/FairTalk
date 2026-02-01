import { useState } from 'react';
import questionsData from '../utils/questions.json';

const ProfileSetup = ({ onProfileComplete }) => {
    const { questions: QUESTIONS, introText: INTRO_TEXT } = questionsData;

    const [step, setStep] = useState(1);
    const [answers, setAnswers] = useState({});
    const [formData, setFormData] = useState({ nickname: '', bio: '' });
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

    const handleSubmit = (e) => {
        e.preventDefault();
        const nickname = formData.nickname.trim();

        if (!nickname || nickname.length < 3 || nickname.length > 20) {
            setError('Nickname must be between 3 and 20 characters.');
            return;
        }

        if (formData.bio.length > 120) {
            setError('Bio must be under 120 characters.');
            return;
        }

        const profileData = {
            nickname,
            bio: formData.bio.trim(),
            personalityAnswers: answers
        };

        onProfileComplete(profileData);
    };

    if (step === 1) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto bg-gray-900 rounded-xl shadow-2xl border border-gray-800">
                <h2 className="text-2xl font-bold text-white mb-6">Welcome</h2>

                <div className="bg-gray-800 p-6 rounded-lg mb-8 text-gray-300 text-sm leading-relaxed whitespace-pre-line text-left">
                    {INTRO_TEXT}
                </div>

                <button
                    onClick={() => setStep(2)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                >
                    I Understand & Continue
                </button>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="p-6 max-w-2xl mx-auto bg-gray-900 rounded-xl border border-gray-800">
                <h2 className="text-xl font-bold text-white mb-6 text-center">
                    Conversation Style
                </h2>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {QUESTIONS.map((q) => (
                        <div key={q.id} className="bg-gray-800 p-4 rounded-lg">
                            <p className="text-gray-300 font-medium mb-3">
                                {q.text}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {q.options.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleOptionSelect(q.id, opt.id)}
                                        className={`px-4 py-2 rounded-md text-sm text-left transition-all border ${answers[q.id] === opt.id
                                            ? 'bg-blue-600 border-blue-500 text-white'
                                            : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                                            }`}
                                    >
                                        {opt.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-4 border-t border-gray-800">
                    <button
                        onClick={() => setStep(3)}
                        disabled={!isQuestionsComplete}
                        className={`w-full py-3 font-semibold rounded-lg transition ${isQuestionsComplete
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        Next Step
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-gray-900 p-8 rounded-xl shadow-2xl border border-gray-800">
                <h2 className="text-2xl font-bold text-white mb-2 text-center">
                    Almost There
                </h2>
                <p className="text-gray-400 text-sm text-center mb-8">
                    Set a temporary identity for this session.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">

                    <div>
                        <label className="block text-gray-400 text-xs uppercase font-bold mb-2">
                            Nickname <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="nickname"
                            value={formData.nickname}
                            onChange={handleInputChange}
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition placeholder-gray-600"
                            placeholder="ex: NeonTraveller"
                            maxLength={20}
                            autoComplete="off"
                        />
                        <p className="text-gray-600 text-xs mt-1 text-right">
                            {formData.nickname.length}/20
                        </p>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-xs uppercase font-bold mb-2">
                            Bio <span className="text-gray-600">(Optional)</span>
                        </label>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition placeholder-gray-600 resize-none"
                            placeholder="Short & sweet..."
                            maxLength={120}
                        />
                        <p className="text-gray-600 text-xs mt-1 text-right">
                            {formData.bio.length}/120
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-800/50 rounded text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg shadow-green-900/30 transition transform active:scale-95"
                    >
                        Enter Chat
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProfileSetup;