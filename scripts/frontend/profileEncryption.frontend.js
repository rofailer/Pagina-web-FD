document.addEventListener('DOMContentLoaded', () => {
    const config = window.cryptoConfig;
    if (!config) return;

    const encryptionTypeMessage = document.getElementById('encryptionTypeMsg');
    const newKeyEncryptionLabel = document.getElementById('newKeyEncryptionLabel');
    const newKeyEncryptionDetails = document.getElementById('newKeyEncryptionDetails');
    const options = Array.from(document.querySelectorAll('.encryption-option'));

    function renderEncryptionSettings() {
        const selected = config.getCurrentOption();

        if (encryptionTypeMessage) {
            encryptionTypeMessage.textContent =
                `${selected.label} se aplicará a la nueva llave. Las llaves existentes conservan su cifrado original.`;
        }
        if (newKeyEncryptionLabel) {
            newKeyEncryptionLabel.textContent = selected.label;
        }
        if (newKeyEncryptionDetails) {
            newKeyEncryptionDetails.textContent = selected.details;
        }

        options.forEach(option => {
            const isSelected = option.dataset.encryption === selected.type;
            option.classList.toggle('selected', isSelected);
            option.setAttribute('aria-pressed', String(isSelected));
        });
    }

    options.forEach(option => {
        option.addEventListener('click', () => {
            if (config.setCurrentType(option.dataset.encryption)) {
                renderEncryptionSettings();
            }
        });
    });

    document.addEventListener('crypto-config:change', renderEncryptionSettings);
    window.renderEncryptionSettings = renderEncryptionSettings;
    renderEncryptionSettings();
});
