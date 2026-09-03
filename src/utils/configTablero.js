/**
 * Helper to encode/decode invisible config in board descriptions.
 * We use this to avoid altering the database schema for custom board configurations.
 */

const CONFIG_PREFIX = '<!-- CONFIG:';
const CONFIG_SUFFIX = '-->';

export function parseTableroConfig(descripcion) {
    if (!descripcion) return { text: '', config: { req_com: [] } };
    
    const startIndex = descripcion.indexOf(CONFIG_PREFIX);
    if (startIndex === -1) {
        // Legacy boards default to requiring comment for Resuelto
        return { text: descripcion, config: { req_com: ['Resuelto'] } };
    }

    const text = descripcion.substring(0, startIndex).trimEnd();
    const configStr = descripcion.substring(startIndex + CONFIG_PREFIX.length, descripcion.indexOf(CONFIG_SUFFIX, startIndex)).trim();
    
    let config = { req_com: [] };
    try {
        config = JSON.parse(configStr);
    } catch (e) {
        console.error('Error parsing tablero config:', e);
    }
    
    return { text, config };
}

export function buildTableroConfig(text, config) {
    const cleanText = text ? text.replace(/<!-- CONFIG:.*?-->/gs, '').trimEnd() : '';
    if (!config || !config.req_com || config.req_com.length === 0) {
        // If config is empty, we don't need to append anything unless they specifically cleared it
        // We still append it so it overwrites legacy.
        return `${cleanText}\n\n${CONFIG_PREFIX}${JSON.stringify(config)}${CONFIG_SUFFIX}`;
    }
    return `${cleanText}\n\n${CONFIG_PREFIX}${JSON.stringify(config)}${CONFIG_SUFFIX}`;
}
