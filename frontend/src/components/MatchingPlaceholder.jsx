const MatchingPlaceholder = ({ data }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 font-sans p-6">
            <div className="bg-gray-800 text-white p-8 rounded-xl shadow-2xl max-w-2xl w-full border border-gray-700">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-6">
                    Module 1 Complete
                </h1>

                <div className="space-y-6">
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-400 mb-4 border-b border-gray-700 pb-2">
                            Matching Handoff Payload
                        </h2>
                        <pre className="text-xs sm:text-sm font-mono text-green-400 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className={`p-4 rounded-lg border ${data.eligible ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
                            <p className="text-xs uppercase font-bold text-gray-500 mb-1">Status</p>
                            <p className={`text-lg font-bold ${data.eligible ? 'text-green-400' : 'text-red-400'}`}>
                                {data.eligible ? 'ELIGIBLE FOR MATCHING' : 'NOT ELIGIBLE'}
                            </p>
                        </div>
                        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                            <p className="text-xs uppercase font-bold text-gray-500 mb-1">User Identity</p>
                            <p className="text-gray-300">
                                {data.nickname} <span className="text-gray-500 text-sm">({data.gender})</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MatchingPlaceholder;
