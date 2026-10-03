/**
 * Get the ordered list of paintings
 *
 * @param collection    collection of paintings
 */
export function sortPainting(a, b) {
    const aord = a.data.order ?? 999999;
    const bord = b.data.order ?? 999999;
    if ( aord === bord ) {
        if ( a.data.year === b.data.year ) {
            return a.data.title - b.data.title;
        }
        return b.data.year - a.data.year;
    }
    return aord - bord;
}
