import UIkit from 'uikit';

export const notifyError = (message) => {
    UIkit.notification({
        message: `
            <span uk-icon="warning"></span>
            ${message}
        `,
        status: 'danger',
        pos: 'top-right',
        timeout: 3000
    });
};

export const notifySuccess = (message) => {
    UIkit.notification({
        message: `
            <span uk-icon="check"></span>
            ${message}
        `,
        status: 'success',
        pos: 'top-right',
        timeout: 2500
    });
};