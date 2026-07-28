'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const actions = {
        'sign-document': () => window.handleSignDocumentClick?.(),
        'verify-document': () => {
            window.location.hash = 'verificar';
        },
        'clear-sign-file': () => window.clearSignFile?.(),
        'clear-signature-image': () => window.clearSignatureImage?.(),
        'clear-signed-file': () => window.clearSignedFile?.(),
        'clear-original-file': () => window.clearOriginalFile?.(),
        'select-profile-photo': () => window.selectProfilePhoto?.(),
        'save-profile': () => window.saveUserData?.(),
        'create-key': () => window.showCreateKeyModal?.(),
        'open-admin-panel': () => window.openAdminPanel?.(),
        'change-profile-password': () => window.changeProfilePassword?.()
    };

    document.addEventListener('click', event => {
        const target = event.target.closest('[data-fd-action]');
        if (!target) return;
        const handler = actions[target.dataset.fdAction];
        if (handler) handler(event);
    });

    document.addEventListener('change', event => {
        const action = event.target.dataset.fdChange;
        if (action === 'profile-photo') {
            window.handleProfilePhoto?.(event);
        } else if (action === 'profile-experience') {
            window.updateProfileExperience?.(event.target);
        }
    });

    document.querySelectorAll('[data-fd-action][role="button"]').forEach(element => {
        element.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            element.click();
        });
    });
});
