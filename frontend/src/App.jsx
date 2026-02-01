function App() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="bg-gray-800 text-white p-8 rounded-xl shadow-xl text-center space-y-4">
                <h1 className="text-3xl font-bold text-green-400">
                    Klymo Hackathon
                </h1>

                <p className="text-gray-300">
                    If you see colors, spacing, and centering - you're good to go.
                </p>

                <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition">
                    Test Button
                </button>
            </div>
        </div>
    );
}

export default App;