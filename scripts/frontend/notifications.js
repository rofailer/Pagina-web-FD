// ===========================
// SISTEMA DE NOTIFICACIONES APILADAS
// ===========================

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.maxNotifications = 3;
        this.notificationHeight = 0; // Se calculará dinámicamente
        this.spacing = 8; // Aumentado de 2 a 8 para más separación
        this.isProcessing = false; // Para evitar múltiples procesamientos simultáneos
        this.setupContainer();
        this.setupStyles();
        this.startCleanupInterval();
    }

    setupContainer() {
        // Crear contenedor para notificaciones si no existe
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 99999;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        this.container = container;
    }

    setupStyles() {
        // Agregar estilos CSS si no existen
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification-item {
                    background: #2196F3;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                    font-weight: 500;
                    font-size: 14px;
                    min-width: 280px;
                    max-width: 380px;
                    margin-bottom: 0;
                    transform: translateX(100%);
                    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease;
                    opacity: 0;
                    pointer-events: auto;
                    cursor: pointer;
                    word-wrap: break-word;
                    position: absolute;
                    overflow: hidden;
                    will-change: transform, opacity;
                    top: 0;
                    right: 0;
                }

                .notification-item.show {
                    transform: translateX(0);
                    opacity: 1;
                }

                .notification-item.hide {
                    transform: translateX(100%);
                    opacity: 0;
                }

                .notification-item.fade-out {
                    opacity: 0.6;
                    transform: scale(0.95);
                }

                .notification-item.success {
                    background: linear-gradient(135deg, #4CAF50, #45a049);
                }

                .notification-item.error {
                    background: linear-gradient(135deg, #f44336, #d32f2f);
                }

                .notification-item.warning {
                    background: linear-gradient(135deg, #ff9800, #f57c00);
                }

                .notification-item.info {
                    background: linear-gradient(135deg, #2196F3, #1976d2);
                }

                .notification-item:hover {
                    transform: translateX(-3px) scale(1.01);
                    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                }

                .notification-close {
                    position: absolute;
                    top: 6px;
                    right: 8px;
                    color: rgba(255,255,255,0.8);
                    font-size: 16px;
                    cursor: pointer;
                    line-height: 1;
                    padding: 2px;
                    transition: color 0.2s;
                }

                .notification-close:hover {
                    color: white;
                }
            `;
            document.head.appendChild(styles);
        }
    }

    show(message, type = 'info', duration = 3500) {
        // Evitar spam de notificaciones - limitar a una cada 100ms
        if (this.isProcessing) {
            return null;
        }

        this.isProcessing = true;
        setTimeout(() => {
            this.isProcessing = false;
        }, 100);

        // Verificar si ya existe una notificación idéntica reciente
        const recentDuplicate = this.notifications.find(notif =>
            notif.message === message &&
            notif.type === type &&
            (Date.now() - notif.timestamp) < 1000
        );

        if (recentDuplicate) {
            return recentDuplicate;
        }

        // Crear la notificación
        const notification = this.createNotification(message, type, duration);

        // Remover exceso ANTES de agregar la nueva
        this.removeOldNotifications();

        // Agregar al array y contenedor
        this.notifications.push(notification);
        this.container.appendChild(notification.element);

        // Mostrar con animación usando requestAnimationFrame para mejor rendimiento
        requestAnimationFrame(() => {
            notification.element.classList.add('show');
            // Actualizar posiciones después de que el elemento sea visible
            setTimeout(() => {
                this.updatePositions();
            }, 50);
        });

        return notification;
    }

    createNotification(message, type, duration) {
        const element = document.createElement('div');
        element.className = `notification-item ${type}`;

        element.innerHTML = `
            <span class="notification-close">&times;</span>
            <div style="padding-right: 25px;">${message}</div>
        `;

        const notification = {
            element,
            type,
            message,
            timestamp: Date.now(),
            duration
        };

        // Evento para cerrar manualmente
        const closeBtn = element.querySelector('.notification-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.remove(notification);
        });

        // Cerrar al hacer clic en la notificación
        element.addEventListener('click', () => {
            this.remove(notification);
        });

        // Auto-remover después del duration
        setTimeout(() => {
            this.remove(notification);
        }, duration);

        return notification;
    }

    remove(notification) {
        const index = this.notifications.indexOf(notification);
        if (index === -1) return;

        // Animación de salida
        notification.element.classList.remove('show');
        notification.element.classList.add('hide');

        // Remover del array inmediatamente para evitar inconsistencias
        this.notifications.splice(index, 1);

        // Actualizar posiciones inmediatamente
        this.updatePositions();

        // Remover del DOM después de la animación
        setTimeout(() => {
            if (notification.element && notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
        }, 300);
    }

    updatePositions() {
        // Usar requestAnimationFrame para mejor rendimiento
        requestAnimationFrame(() => {
            let currentY = 0;

            this.notifications.forEach((notification, index) => {
                if (notification.element) {
                    // Posicionar la notificación
                    notification.element.style.transform = `translateY(${currentY}px)`;

                    // Calcular la siguiente posición basándose en el tamaño real del elemento
                    const rect = notification.element.getBoundingClientRect();
                    currentY += rect.height + this.spacing;

                    // Efecto de difuminado para notificaciones más antiguas
                    if (index >= this.maxNotifications - 1) {
                        notification.element.classList.add('fade-out');
                    } else {
                        notification.element.classList.remove('fade-out');
                    }
                }
            });
        });
    }

    removeOldNotifications() {
        // Remover notificaciones que excedan el límite
        while (this.notifications.length >= this.maxNotifications) {
            const oldestNotification = this.notifications[0];
            this.remove(oldestNotification);
        }
    }

    clear() {
        // Limpiar todas las notificaciones de forma eficiente
        this.notifications.forEach(notification => {
            if (notification.element && notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
        });
        this.notifications = [];
    }

    // Limpieza automática de notificaciones huérfanas cada 30 segundos
    startCleanupInterval() {
        setInterval(() => {
            // Remover notificaciones que ya no están en el DOM
            this.notifications = this.notifications.filter(notification => {
                if (!notification.element || !notification.element.parentNode) {
                    return false;
                }
                return true;
            });
        }, 30000);
    }
}

// Crear instancia global del manejador de notificaciones
window.notificationManager = new NotificationManager();

// Función global para mostrar notificaciones (compatibilidad con código existente)
window.showNotification = function (message, type = 'info', duration = 3500) {
    // Validar parámetros para evitar errores
    if (!message || typeof message !== 'string') {
        return null;
    }

    // Truncar mensajes muy largos para evitar problemas de memoria
    if (message.length > 200) {
        message = message.substring(0, 197) + '...';
    }

    return window.notificationManager.show(message, type, duration);
};

// Hacer disponible la clase para uso avanzado
window.NotificationManager = NotificationManager;
