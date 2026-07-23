(function exposeCryptoConfiguration() {
    const STORAGE_KEY = 'encryptionType';
    const DEFAULT_TYPE = 'aes-256-gcm-v2';
    const OPTIONS = Object.freeze([
        Object.freeze({
            type: DEFAULT_TYPE,
            label: 'AES-256-GCM v2',
            shortLabel: 'AES-256-GCM',
            description: 'Cifrado autenticado de uso general, rápido y ampliamente compatible.',
            details: 'scrypt · nonce de 96 bits · autenticación de 128 bits',
            recommended: true
        }),
        Object.freeze({
            type: 'chacha20-poly1305-v3',
            label: 'ChaCha20-Poly1305 v3',
            shortLabel: 'ChaCha20-Poly1305',
            description: 'Alternativa autenticada con rendimiento estable incluso sin aceleración AES.',
            details: 'scrypt · nonce de 96 bits · autenticación de 128 bits',
            recommended: false
        })
    ]);

    const getOption = type => OPTIONS.find(option => option.type === type) || null;
    let selectedType = DEFAULT_TYPE;

    try {
        const storedType = localStorage.getItem(STORAGE_KEY);
        if (getOption(storedType)) selectedType = storedType;
    } catch (error) {
        // La selección continúa disponible durante la sesión si el almacenamiento está bloqueado.
    }

    const config = {
        defaultType: DEFAULT_TYPE,
        options: OPTIONS,
        get currentType() {
            return selectedType;
        },
        get currentLabel() {
            return getOption(selectedType)?.label || OPTIONS[0].label;
        },
        getCurrentOption() {
            return getOption(selectedType) || OPTIONS[0];
        },
        getOption,
        isSupported(type) {
            return Boolean(getOption(type));
        },
        setCurrentType(type) {
            const option = getOption(type);
            if (!option) return false;

            selectedType = option.type;
            try {
                localStorage.setItem(STORAGE_KEY, selectedType);
            } catch (error) {
                // La selección sigue activa durante esta sesión.
            }

            document.dispatchEvent(new CustomEvent('crypto-config:change', {
                detail: { type: selectedType, option }
            }));
            return true;
        },
        formatEncryptionType(type) {
            return getOption(type)?.label || 'Formato no compatible';
        }
    };

    window.cryptoConfig = Object.freeze(config);
})();
