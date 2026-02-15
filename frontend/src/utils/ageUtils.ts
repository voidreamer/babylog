export function calculateAgeInMonths(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 +
        (today.getMonth() - birth.getMonth());
    return Math.max(0, months);
}
