const express = require('express');
const pool = require('../db/pool');
const authenticate = require('../middlewares/authenticate');

const router = express.Router();
const TUTORIAL_PREFERENCE_KEY = 'tutorial_progress_v2';
const ALLOWED_STEPS = new Set([
    'cuenta',
    'llave',
    'firma',
    'verificacion',
    'resultado'
]);

function normalizeCompletedSteps(value) {
    if (!Array.isArray(value)) return [];

    return [...new Set(value)]
        .filter(step => typeof step === 'string' && ALLOWED_STEPS.has(step));
}

router.get('/progress', authenticate, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT valor
             FROM user_preferences
             WHERE user_id = ? AND clave = ?
             LIMIT 1`,
            [req.user.id, TUTORIAL_PREFERENCE_KEY]
        );

        let completedSteps = [];
        if (rows.length > 0) {
            try {
                completedSteps = normalizeCompletedSteps(JSON.parse(rows[0].valor));
            } catch (_error) {
                completedSteps = [];
            }
        }

        res.json({
            success: true,
            completedSteps,
            storage: 'account'
        });
    } catch (error) {
        console.error('Error al cargar el progreso del tutorial:', error.message);
        res.status(500).json({
            success: false,
            error: 'No se pudo cargar el progreso del tutorial'
        });
    }
});

router.put('/progress', authenticate, async (req, res) => {
    if (
        !Array.isArray(req.body.completedSteps)
        || req.body.completedSteps.length > ALLOWED_STEPS.size
    ) {
        return res.status(400).json({
            success: false,
            error: 'El progreso del tutorial no tiene un formato válido'
        });
    }

    const completedSteps = normalizeCompletedSteps(req.body.completedSteps);
    if (completedSteps.length !== new Set(req.body.completedSteps).size) {
        return res.status(400).json({
            success: false,
            error: 'El progreso contiene etapas no válidas'
        });
    }

    try {
        await pool.query(
            `INSERT INTO user_preferences (user_id, clave, valor)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_at = NOW()`,
            [req.user.id, TUTORIAL_PREFERENCE_KEY, JSON.stringify(completedSteps)]
        );

        res.json({
            success: true,
            completedSteps,
            storage: 'account'
        });
    } catch (error) {
        console.error('Error al guardar el progreso del tutorial:', error.message);
        res.status(500).json({
            success: false,
            error: 'No se pudo guardar el progreso del tutorial'
        });
    }
});

module.exports = router;
