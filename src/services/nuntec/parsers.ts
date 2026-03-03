
/**
 * Helper to extract text content from an XML tag
 */
export function getTagValue(parent: Element, tag: string): string | null {
    const elements = parent.getElementsByTagName(tag);
    if (elements && elements.length > 0) {
        return elements[0].textContent;
    }
    return null;
}

/**
 * Parses an XML string into a DOM Document.
 * Throws error if HTML (login redirect) is detected.
 */
export function parseXML(xmlText: string): Document {
    if (xmlText.includes('<html') || xmlText.includes('<!DOCTYPE html>')) {
        throw new Error('API returned HTML (Likely Login Redirect/Auth Failure)');
    }
    const parser = new DOMParser();
    return parser.parseFromString(xmlText, 'text/xml');
}
