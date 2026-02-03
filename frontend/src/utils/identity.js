const DEVICE_ID_KEY = 'chat_device_id';

export const getOrCreateDeviceId = () => {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            deviceId = crypto.randomUUID();
        } else {
            deviceId = `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        localStorage.setItem(DEVICE_ID_KEY, deviceId);
        localStorage.setItem("chat_device_created_at", new Date().toISOString());
        console.log('[Identity] New Device ID generated:', deviceId);
    } else {
        console.log('[Identity] Existing Device ID found:', deviceId);
    }

    return deviceId;
};
