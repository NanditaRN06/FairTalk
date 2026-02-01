const EligibilityConfirmation = ({ onJoin, onLeave }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 font-sans p-6">
            <div className="bg-gray-800 text-white p-8 rounded-xl shadow-2xl max-w-md w-full border border-gray-700 text-center">
                <div className="mb-6">
                    <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">You are Eligible</h2>
                    <p className="text-gray-400">Would you like to enter the chat room?</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onLeave}
                        className="flex-1 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-800/50 font-semibold rounded-lg transition"
                    >
                        No
                    </button>
                    <button
                        onClick={onJoin}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg shadow-green-900/20 transition"
                    >
                        Yes, Enter Chat
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EligibilityConfirmation;
