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

        onProfileComplete({
            nickname,
            bio: formData.bio.trim(),
            personalityAnswers: answers
        });
    };

    if (step === 1) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="w-full max-w-xl bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 p-8 sm:p-10 text-center">

                    <h2 className="text-3xl font-extrabold text-white mb-4">
                        Welcome
                    </h2>

                    <p className="text-gray-400 text-sm mb-8">
                        Before we start, here’s how this works.
                    </p>

                    <div className="bg-gray-800/80 p-6 rounded-xl mb-10 text-gray-300 text-sm leading-relaxed whitespace-pre-line text-left">
                        {INTRO_TEXT}
                    </div>

                    <button
                        onClick={() => setStep(2)}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.01] active:scale-95"
                    >
                        I Understand & Continue
                    </button>
                </div>
            </div>
        );
    }

    if (step === 2) {
        const answeredCount = Object.keys(answers).length;

        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="w-full max-w-3xl bg-gray-900 rounded-2xl border border-gray-800 p-8">

                    <h2 className="text-2xl font-bold text-white mb-2 text-center">
                        Conversation Style
                    </h2>

                    <p className="text-gray-400 text-sm text-center mb-6">
                        No right or wrong answers — just vibes.
                    </p>

                    <div className="mb-8">
                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                            <span>Progress</span>
                            <span>{answeredCount}/{QUESTIONS.length}</span>
                        </div>

                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                                style={{
                                    width: `${(answeredCount / QUESTIONS.length) * 100}%`
                                }}
                            />
                        </div>
                    </div>

                    <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                        {QUESTIONS.map((q, index) => (
                            <div
                                key={q.id}
                                className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl border border-gray-700 shadow-lg"
                            >
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
                                        {index + 1}
                                    </div>
                                    <p className="text-gray-200 font-semibold">
                                        {q.text}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {q.options.map((opt) => {
                                        const isSelected = answers[q.id] === opt.id;

                                        return (
                                            <button
                                                key={opt.id}
                                                onClick={() => handleOptionSelect(q.id, opt.id)}
                                                className={`relative px-4 py-3 rounded-xl text-sm text-left border transition-all duration-200
                                                ${isSelected
                                                        ? 'bg-blue-600 border-blue-500 text-white shadow-md scale-[1.02]'
                                                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                                                    }`}
                                            >
                                                <span className="font-medium">
                                                    {opt.text}
                                                </span>

                                                {isSelected && (
                                                    <span className="absolute top-2 right-3 text-xs opacity-80">
                                                        ✓
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-4 border-t border-gray-800">
                        <button
                            onClick={() => setStep(3)}
                            disabled={!isQuestionsComplete}
                            className={`w-full py-3.5 font-bold rounded-xl transition-all transform
                            ${isQuestionsComplete
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:scale-[1.01]'
                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {isQuestionsComplete ? 'Continue →' : 'Answer all questions'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-800">

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
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition placeholder-gray-600"
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
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition placeholder-gray-600 resize-none"
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
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-900/30 transition transform active:scale-95"
                    >
                        Enter Chat
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProfileSetup;