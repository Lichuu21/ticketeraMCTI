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
    const endIndex = descripcion.indexOf(CONFIG_SUFFIX, startIndex);
    if (endIndex === -1) {
        return { text: descripcion, config: { req_com: ['Resuelto'] } };
    }
    const configStr = descripcion.substring(startIndex + CONFIG_PREFIX.length, endIndex).trim();
    
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
    return `${cleanText}\n\n${CONFIG_PREFIX}${JSON.stringify(config || {})}${CONFIG_SUFFIX}`;
}
