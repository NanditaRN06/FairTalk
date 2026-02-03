/**
 * Match Configuration and Strategy
 * Define how users are matched based on various criteria
 */

const matchConfig = {
    // Maximum distance in km for matching
    maxDistance: 100,
    
    // Default distance in km for initial matching
    defaultDistance: 50,
    
    // Timeout (in seconds) waiting for a match
    matchTimeout: 300, // 5 minutes
    
    // Session timeout (in seconds)
    sessionTimeout: 3600, // 1 hour
    
    // Match session expiry in Redis (seconds)
    redisSessionTTL: 3600,
    
    // Queue check interval (in milliseconds)
    queueCheckInterval: 5000, // 5 seconds
    
    // Matching strategies
    strategies: {
        DISTANCE: 'distance',
        INTERESTS: 'interests',
        RANDOM: 'random',
        HYBRID: 'hybrid'
    },
    
    // Default strategy
    defaultStrategy: 'distance',
    
    // Age range validation
    ageRange: {
        min: 18,
        max: 120
    },
    
    // Language preferences (for future use)
    languages: ['English', 'Spanish', 'French', 'German', 'Chinese'],
    
    // Scoring weights for hybrid matching
    weights: {
        distance: 0.5,      // 50% weight on proximity
        interests: 0.3,     // 30% weight on shared interests
        language: 0.2       // 20% weight on language match
    },
    
    // Message rate limiting
    rateLimit: {
        messagesPerSecond: 10,
        maxMessageLength: 1000
    },
    
    // Autoban criteria
    autoBan: {
        maxReportsBeforeBan: 3,
        banDurationDays: 7
    }
};

/**
 * Match Strategy Implementations
 */
const matchStrategies = {
    /**
     * Distance-based matching: Match users closest to each other
     */
    distance: async (userId, userLocation, queue, redisService) => {
        const availableUsers = queue.filter(u => u.userId !== userId);
        
        if (availableUsers.length === 0) return null;
        
        const matches = availableUsers.map(user => {
            const distance = redisService.calculateDistance(userLocation, user.location);
            return { ...user, distance };
        });
        
        // Filter by max distance
        const validMatches = matches.filter(m => m.distance <= matchConfig.maxDistance);
        
        if (validMatches.length === 0) return null;
        
        // Sort by distance and return closest
        validMatches.sort((a, b) => a.distance - b.distance);
        return validMatches[0];
    },

    /**
     * Interest-based matching: Match users with shared interests
     */
    interests: async (userId, userPreferences, queue) => {
        const availableUsers = queue.filter(u => u.userId !== userId);
        
        if (availableUsers.length === 0) return null;
        
        const userInterests = new Set(userPreferences.interests || []);
        
        const matches = availableUsers.map(user => {
            const partnerInterests = new Set(user.preferences?.interests || []);
            
            // Calculate intersection of interests
            const sharedInterests = [...userInterests].filter(i => 
                partnerInterests.has(i)
            ).length;
            
            const totalInterests = new Set([...userInterests, ...partnerInterests]).size;
            const similarity = totalInterests > 0 ? sharedInterests / totalInterests : 0;
            
            return { ...user, similarity };
        });
        
        // Sort by similarity and return best match
        matches.sort((a, b) => b.similarity - a.similarity);
        return matches[0];
    },

    /**
     * Random matching: Match any available user randomly
     */
    random: async (userId, userLocation, queue) => {
        const availableUsers = queue.filter(u => u.userId !== userId);
        
        if (availableUsers.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * availableUsers.length);
        return availableUsers[randomIndex];
    },

    /**
     * Hybrid matching: Combine multiple criteria
     */
    hybrid: async (userId, userData, queue, redisService) => {
        const availableUsers = queue.filter(u => u.userId !== userId);
        
        if (availableUsers.length === 0) return null;
        
        const { location, preferences } = userData;
        const userInterests = new Set(preferences?.interests || []);
        
        const matches = availableUsers.map(user => {
            // Distance score (0-1)
            const distance = redisService.calculateDistance(location, user.location);
            const distanceScore = Math.max(0, 1 - (distance / matchConfig.maxDistance));
            
            // Interest score (0-1)
            const partnerInterests = new Set(user.preferences?.interests || []);
            const sharedInterests = [...userInterests].filter(i => 
                partnerInterests.has(i)
            ).length;
            const totalInterests = new Set([...userInterests, ...partnerInterests]).size;
            const interestScore = totalInterests > 0 ? sharedInterests / totalInterests : 0;
            
            // Combined score
            const combinedScore = 
                (distanceScore * matchConfig.weights.distance) +
                (interestScore * matchConfig.weights.interests);
            
            return { ...user, combinedScore, distanceScore, interestScore };
        });
        
        // Sort by combined score
        matches.sort((a, b) => b.combinedScore - a.combinedScore);
        return matches[0];
    }
};

/**
 * Get matching function based on strategy
 */
const getMatchFunction = (strategy = matchConfig.defaultStrategy) => {
    return matchStrategies[strategy] || matchStrategies[matchConfig.defaultStrategy];
};

/**
 * Validate user data before matching
 */
const validateUserData = (userData) => {
    const { userId, location, preferences } = userData;
    
    if (!userId || !location) {
        return { valid: false, error: 'Missing userId or location' };
    }
    
    if (!location.lat || !location.lon) {
        return { valid: false, error: 'Invalid location coordinates' };
    }
    
    if (preferences && preferences.age) {
        const { age } = preferences;
        if (age < matchConfig.ageRange.min || age > matchConfig.ageRange.max) {
            return { valid: false, error: 'Age out of range' };
        }
    }
    
    return { valid: true };
};

module.exports = {
    matchConfig,
    matchStrategies,
    getMatchFunction,
    validateUserData
};
